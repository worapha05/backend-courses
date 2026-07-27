using System.Threading.Channels;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Orders.Application;
using Orders.Domain;

namespace Orders.Infrastructure;

public sealed class OrdersDbContext(DbContextOptions<OrdersDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId);
            e.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.OrderId);
        });

        modelBuilder.Entity<OrderLine>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Sku).HasMaxLength(64).IsRequired();
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
        });
    }
}

public sealed class OrderRepository(OrdersDbContext db) : IOrderRepository
{
    public Task AddAsync(Order order, CancellationToken ct = default)
    {
        db.Orders.Add(order);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}

public sealed class OrderQueryService(OrdersDbContext db, IServiceScopeFactory scopeFactory) : IOrderQueryService
{
    public async Task<IReadOnlyList<OrderListItem>> ListAsync(CancellationToken ct = default)
    {
        // SQLite cannot Sum(decimal) server-side — cast to double for SQL, then back to decimal.
        var rows = await db.Orders.AsNoTracking()
            .Select(o => new
            {
                o.Id,
                CustomerName = o.Customer.Name,
                o.Status,
                Total = o.Lines.Sum(l => (double)l.Quantity * (double)l.UnitPrice),
                LineCount = o.Lines.Count
            })
            .OrderByDescending(x => x.Total)
            .ToListAsync(ct);

        return rows
            .Select(x => new OrderListItem(
                x.Id,
                x.CustomerName,
                x.Status.ToString(),
                (decimal)x.Total,
                x.LineCount))
            .ToList();
    }

    public async Task<DashboardSummary> GetSummaryAsync(CancellationToken ct = default)
    {
        async Task<int> CountCustomersAsync()
        {
            using var scope = scopeFactory.CreateScope();
            var scoped = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();
            return await scoped.Customers.CountAsync(ct);
        }

        async Task<(int Orders, decimal Revenue)> AggregateOrdersAsync()
        {
            using var scope = scopeFactory.CreateScope();
            var scoped = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();
            var orders = await scoped.Orders.CountAsync(ct);
            var revenue = await scoped.OrderLines
                .SumAsync(l => (double)l.Quantity * (double)l.UnitPrice, ct);
            return (orders, (decimal)revenue);
        }

        var customersTask = CountCustomersAsync();
        var ordersTask = AggregateOrdersAsync();
        await Task.WhenAll(customersTask, ordersTask);

        var (orderCount, revenue) = await ordersTask;
        return new DashboardSummary(await customersTask, orderCount, revenue);
    }
}

public sealed class InMemoryExportQueue : IExportQueue
{
    private readonly Channel<ExportJob> _channel = Channel.CreateUnbounded<ExportJob>();
    public ValueTask EnqueueAsync(ExportJob job, CancellationToken ct = default) => _channel.Writer.WriteAsync(job, ct);
    public ValueTask<ExportJob> DequeueAsync(CancellationToken ct = default) => _channel.Reader.ReadAsync(ct);
}

public sealed class InMemoryExportStore : IExportStore
{
    private readonly Dictionary<Guid, ExportJobState> _map = new();
    private readonly object _gate = new();

    public void Set(ExportJobState state)
    {
        lock (_gate) _map[state.Id] = state;
    }

    public ExportJobState? Get(Guid id)
    {
        lock (_gate) return _map.GetValueOrDefault(id);
    }
}

public static class ExcelOrderExporter
{
    public static async Task<string> ExportAsync(
        OrdersDbContext db,
        string directory,
        Guid jobId,
        CancellationToken ct)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"orders-{jobId:N}.xlsx");

        var rows = await db.Orders.AsNoTracking()
            .Select(o => new
            {
                o.Id,
                Customer = o.Customer.Name,
                o.Status,
                Total = o.Lines.Sum(l => (double)l.Quantity * (double)l.UnitPrice)
            })
            .ToListAsync(ct);

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Orders");
        sheet.Cell(1, 1).Value = "OrderId";
        sheet.Cell(1, 2).Value = "Customer";
        sheet.Cell(1, 3).Value = "Status";
        sheet.Cell(1, 4).Value = "Total";
        sheet.Range(1, 1, 1, 4).Style.Font.Bold = true;

        var r = 2;
        foreach (var row in rows)
        {
            sheet.Cell(r, 1).Value = row.Id.ToString();
            sheet.Cell(r, 2).Value = row.Customer;
            sheet.Cell(r, 3).Value = row.Status.ToString();
            sheet.Cell(r, 4).Value = row.Total;
            r++;
        }

        sheet.Columns().AdjustToContents();
        await Task.Run(() => workbook.SaveAs(path), ct);
        return path;
    }
}

public sealed class ExportBackgroundService(
    IExportQueue queue,
    IExportStore store,
    IServiceScopeFactory scopeFactory,
    IHostEnvironment env,
    ILogger<ExportBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var job = await queue.DequeueAsync(stoppingToken);
            store.Set(new ExportJobState(job.Id, ExportStatus.Running, job.RequestedBy, job.CreatedAt, null, null));

            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<OrdersDbContext>();
                var dir = Path.Combine(env.ContentRootPath, "exports");
                var path = await ExcelOrderExporter.ExportAsync(db, dir, job.Id, stoppingToken);

                store.Set(new ExportJobState(job.Id, ExportStatus.Completed, job.RequestedBy, job.CreatedAt, path, null));
                logger.LogInformation("OrderExported {JobId} by {UserId} path={Path}", job.Id, job.RequestedBy, path);
            }
            catch (Exception ex)
            {
                store.Set(new ExportJobState(job.Id, ExportStatus.Failed, job.RequestedBy, job.CreatedAt, null, ex.Message));
                logger.LogError(ex, "OrderExportFailed {JobId}", job.Id);
            }
        }
    }
}

public static class DependencyInjection
{
    public static IServiceCollection AddOrdersInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<OrdersDbContext>(opt => opt.UseSqlite(connectionString));
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IOrderQueryService, OrderQueryService>();
        services.AddScoped<IOrderAppService, OrderAppService>();
        services.AddSingleton<IExportQueue, InMemoryExportQueue>();
        services.AddSingleton<IExportStore, InMemoryExportStore>();
        services.AddHostedService<ExportBackgroundService>();
        return services;
    }
}

public static class DbSeed
{
    public static async Task SeedAsync(OrdersDbContext db)
    {
        if (await db.Customers.AnyAsync()) return;

        var alice = Customer.Create("Alice", "alice@example.com");
        var bob = Customer.Create("Bob", "bob@example.com");
        db.Customers.AddRange(alice, bob);
        await db.SaveChangesAsync();

        var o1 = Order.Create(alice.Id, [("USB-HUB", 2, 890m), ("NOTE-A5", 3, 120m)]);
        var o2 = Order.Create(bob.Id, [("CAM-1080", 1, 1290m)]);
        var o3 = Order.Create(alice.Id, [("PEN-GEL", 10, 25m)]);
        o2.MarkPaid();

        db.Orders.AddRange(o1, o2, o3);
        await db.SaveChangesAsync();
    }
}

using Microsoft.EntityFrameworkCore;

namespace EfOptimization;

public sealed class Customer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public List<Order> Orders { get; set; } = [];
}

public sealed class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public List<OrderLine> Lines { get; set; } = [];
}

public sealed class OrderLine
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public required string Sku { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrderLine>().Property(x => x.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<Order>()
            .HasOne(x => x.Customer)
            .WithMany(x => x.Orders)
            .HasForeignKey(x => x.CustomerId);
        modelBuilder.Entity<OrderLine>()
            .HasOne(x => x.Order)
            .WithMany(x => x.Lines)
            .HasForeignKey(x => x.OrderId);
    }
}

public static class Seed
{
    public static async Task RunAsync(AppDbContext db)
    {
        if (await db.Customers.AnyAsync()) return;

        var alice = new Customer { Name = "Alice" };
        var bob = new Customer { Name = "Bob" };

        var o1 = new Order
        {
            Customer = alice,
            Lines =
            [
                new OrderLine { Sku = "USB-HUB", Quantity = 2, UnitPrice = 890m },
                new OrderLine { Sku = "NOTE-A5", Quantity = 5, UnitPrice = 120m }
            ]
        };
        var o2 = new Order
        {
            Customer = bob,
            Lines =
            [
                new OrderLine { Sku = "CAM-1080", Quantity = 1, UnitPrice = 1290m }
            ]
        };

        db.AddRange(alice, bob, o1, o2);
        await db.SaveChangesAsync();
    }
}

public sealed record OrderListItem(Guid Id, string CustomerName, decimal Total, int LineCount);

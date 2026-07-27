using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EfOptimization;

[ApiController]
[Route("api/demo")]
public sealed class DemoController(AppDbContext db, IServiceScopeFactory scopeFactory) : ControllerBase
{
    [HttpGet("n-plus-one")]
    public async Task<ActionResult<object>> NPlusOne(CancellationToken ct)
    {
        var orders = await db.Orders.AsNoTracking().Select(o => o.Id).ToListAsync(ct);
        var rows = new List<object>();
        foreach (var id in orders)
        {
            var order = await db.Orders.AsNoTracking()
                .Include(o => o.Customer)
                .Include(o => o.Lines)
                .FirstAsync(o => o.Id == id, ct);
            rows.Add(new
            {
                order.Id,
                Customer = order.Customer.Name,
                Total = order.Lines.Sum(l => l.Quantity * l.UnitPrice)
            });
        }

        return Ok(new { style = "n-plus-one", count = rows.Count, rows });
    }

    [HttpGet("include")]
    public async Task<ActionResult<object>> Include(CancellationToken ct)
    {
        var orders = await db.Orders.AsNoTracking()
            .Include(o => o.Customer)
            .Include(o => o.Lines)
            .ToListAsync(ct);

        var rows = orders.Select(o => new OrderListItem(
            o.Id,
            o.Customer.Name,
            o.Lines.Sum(l => l.Quantity * l.UnitPrice),
            o.Lines.Count));

        return Ok(new { style = "include", rows });
    }

    [HttpGet("select")]
    public async Task<ActionResult<object>> SelectProjection(CancellationToken ct)
    {
        // SQLite cannot Sum(decimal) in SQL — cast to double for provider translation.
        var rows = await db.Orders.AsNoTracking()
            .Select(o => new
            {
                o.Id,
                CustomerName = o.Customer.Name,
                Total = o.Lines.Sum(l => (double)l.Quantity * (double)l.UnitPrice),
                LineCount = o.Lines.Count
            })
            .ToListAsync(ct);

        var dto = rows.Select(o => new OrderListItem(
            o.Id,
            o.CustomerName,
            (decimal)o.Total,
            o.LineCount));

        return Ok(new { style = "select-projection", rows = dto });
    }

    [HttpGet("parallel-safe")]
    public async Task<ActionResult<object>> ParallelSafe(CancellationToken ct)
    {
        async Task<int> CountCustomersAsync()
        {
            using var scope = scopeFactory.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await scopedDb.Customers.CountAsync(ct);
        }

        async Task<int> CountOrdersAsync()
        {
            using var scope = scopeFactory.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await scopedDb.Orders.CountAsync(ct);
        }

        var customersTask = CountCustomersAsync();
        var ordersTask = CountOrdersAsync();
        await Task.WhenAll(customersTask, ordersTask);

        return Ok(new
        {
            customers = await customersTask,
            orders = await ordersTask,
            note = "Used Task.WhenAll with separate DbContext scopes."
        });
    }
}

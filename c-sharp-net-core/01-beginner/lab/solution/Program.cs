using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MiniInventory;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddSingleton<IProductRepository, InMemoryProductRepository>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddSingleton<ExceptionPipeline>();

using var host = builder.Build();
using var scope = host.Services.CreateScope();

var repo = scope.ServiceProvider.GetRequiredService<IProductRepository>();
var inventory = scope.ServiceProvider.GetRequiredService<IInventoryService>();
var pipeline = scope.ServiceProvider.GetRequiredService<ExceptionPipeline>();

await SeedAsync(repo);

await pipeline.ExecuteAsync("Receive USB-HUB +10", async () =>
{
    await inventory.ReceiveAsync("USB-HUB", 10, "PO-1001");
});

await pipeline.ExecuteAsync("Issue USB-HUB -3", async () =>
{
    await inventory.IssueAsync("USB-HUB", 3, "SO-2001");
});

await pipeline.ExecuteAsync("Issue USB-HUB -999 (should 409)", async () =>
{
    await inventory.IssueAsync("USB-HUB", 999, "SO-FAIL");
});

await pipeline.ExecuteAsync("Lookup missing SKU (should 404)", async () =>
{
    await inventory.ReceiveAsync("NO-SUCH", 1, "x");
});

Console.WriteLine("\n=== Stock by category ===");
foreach (var row in await inventory.GetStockByCategoryAsync())
    Console.WriteLine($"{row.Category}: qty={row.TotalQty}, value={row.InventoryValue:C}");

Console.WriteLine("\n=== Out of stock ===");
foreach (var p in await inventory.GetOutOfStockAsync())
    Console.WriteLine($"{p.Sku} — {p.Name}");

Console.WriteLine("\n=== Top 3 inventory value ===");
foreach (var p in await inventory.GetTopInventoryValueAsync(3))
    Console.WriteLine($"{p.Sku}: {p.QuantityOnHand * p.UnitPrice:C}");

static async Task SeedAsync(IProductRepository repo)
{
    Product[] seed =
    [
        new(Guid.NewGuid(), "USB-HUB", "USB-C Hub", "Electronics", 890m, 5),
        new(Guid.NewGuid(), "CAM-1080", "Webcam 1080p", "Electronics", 1290m, 2),
        new(Guid.NewGuid(), "NOTE-A5", "Notebook A5", "Stationery", 120m, 0),
        new(Guid.NewGuid(), "PEN-GEL", "Gel Pen", "Stationery", 25m, 40)
    ];

    foreach (var p in seed)
        await repo.AddAsync(p);
}

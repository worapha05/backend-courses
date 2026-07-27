namespace MiniInventory;

public sealed class InMemoryProductRepository : IProductRepository
{
    private readonly List<Product> _items = [];

    public Task AddAsync(Product product, CancellationToken ct = default)
    {
        if (_items.Any(p => p.Sku.Equals(product.Sku, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Duplicate SKU '{product.Sku}'.");

        _items.Add(product);
        return Task.CompletedTask;
    }

    public Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
    {
        var found = _items.FirstOrDefault(p => p.Sku.Equals(sku, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(found);
    }

    public Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Product>>(_items.ToList());

    public Task UpdateAsync(Product product, CancellationToken ct = default)
    {
        var index = _items.FindIndex(p => p.Id == product.Id);
        if (index < 0)
            throw new NotFoundException($"Product '{product.Id}' not found.");

        _items[index] = product;
        return Task.CompletedTask;
    }
}

public sealed class InventoryService(IProductRepository repo, IClock clock) : IInventoryService
{
    public async Task<Product> ReceiveAsync(string sku, int qty, string reason, CancellationToken ct = default)
    {
        if (qty <= 0) throw new ArgumentOutOfRangeException(nameof(qty));

        var product = await repo.GetBySkuAsync(sku, ct)
            ?? throw new NotFoundException($"SKU '{sku}' not found.");

        var updated = product with { QuantityOnHand = product.QuantityOnHand + qty };
        await repo.UpdateAsync(updated, ct);

        _ = new StockMovement(product.Id, qty, reason, clock.UtcNow);
        return updated;
    }

    public async Task<Product> IssueAsync(string sku, int qty, string reason, CancellationToken ct = default)
    {
        if (qty <= 0) throw new ArgumentOutOfRangeException(nameof(qty));

        var product = await repo.GetBySkuAsync(sku, ct)
            ?? throw new NotFoundException($"SKU '{sku}' not found.");

        if (product.QuantityOnHand < qty)
            throw new InsufficientStockException($"SKU '{sku}' has only {product.QuantityOnHand} left.");

        var updated = product with { QuantityOnHand = product.QuantityOnHand - qty };
        await repo.UpdateAsync(updated, ct);

        _ = new StockMovement(product.Id, -qty, reason, clock.UtcNow);
        return updated;
    }

    public async Task<IReadOnlyList<CategoryStock>> GetStockByCategoryAsync(CancellationToken ct = default)
    {
        var products = await repo.ListAsync(ct);

        return products
            .GroupBy(p => p.Category)
            .Select(g => new CategoryStock(
                g.Key,
                g.Sum(p => p.QuantityOnHand),
                g.Sum(p => p.QuantityOnHand * p.UnitPrice)))
            .OrderBy(x => x.Category)
            .ToList();
    }

    public async Task<IReadOnlyList<Product>> GetOutOfStockAsync(CancellationToken ct = default)
    {
        var products = await repo.ListAsync(ct);
        return products.Where(p => p.QuantityOnHand == 0).OrderBy(p => p.Sku).ToList();
    }

    public async Task<IReadOnlyList<Product>> GetTopInventoryValueAsync(int take, CancellationToken ct = default)
    {
        var products = await repo.ListAsync(ct);
        return products
            .OrderByDescending(p => p.QuantityOnHand * p.UnitPrice)
            .Take(take)
            .ToList();
    }
}

public sealed class ExceptionPipeline
{
    public async Task ExecuteAsync(string label, Func<Task> action)
    {
        try
        {
            await action();
            Console.WriteLine($"[OK 200] {label}");
        }
        catch (Exception ex)
        {
            var status = ex switch
            {
                NotFoundException => 404,
                InsufficientStockException => 409,
                ArgumentException => 400,
                _ => 500
            };
            Console.WriteLine($"[{status}] {label}: {ex.GetType().Name} — {ex.Message}");
        }
    }
}

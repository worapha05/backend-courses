namespace MiniInventory;

public sealed record Product(
    Guid Id,
    string Sku,
    string Name,
    string Category,
    decimal UnitPrice,
    int QuantityOnHand);

public sealed record StockMovement(
    Guid ProductId,
    int Delta,
    string Reason,
    DateTimeOffset At);

public sealed record CategoryStock(
    string Category,
    int TotalQty,
    decimal InventoryValue);

public sealed class NotFoundException(string message) : Exception(message);
public sealed class InsufficientStockException(string message) : Exception(message);

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

public interface IProductRepository
{
    Task AddAsync(Product product, CancellationToken ct = default);
    Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default);
    Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);
}

public interface IInventoryService
{
    Task<Product> ReceiveAsync(string sku, int qty, string reason, CancellationToken ct = default);
    Task<Product> IssueAsync(string sku, int qty, string reason, CancellationToken ct = default);
    Task<IReadOnlyList<CategoryStock>> GetStockByCategoryAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Product>> GetOutOfStockAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Product>> GetTopInventoryValueAsync(int take, CancellationToken ct = default);
}

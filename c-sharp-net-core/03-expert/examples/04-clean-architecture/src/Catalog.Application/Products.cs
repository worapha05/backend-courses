using Catalog.Domain;

namespace Catalog.Application;

public sealed record ProductDto(Guid Id, string Sku, string Name, decimal Price, bool IsActive);

public sealed record CreateProductCommand(string Sku, string Name, decimal Price);

public interface IProductRepository
{
    Task AddAsync(Product product, CancellationToken ct = default);
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Product>> ListActiveAsync(CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IProductService
{
    Task<ProductDto> CreateAsync(CreateProductCommand command, CancellationToken ct = default);
    Task<IReadOnlyList<ProductDto>> ListAsync(CancellationToken ct = default);
    Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default);
}

public sealed class ProductService(IProductRepository repository) : IProductService
{
    public async Task<ProductDto> CreateAsync(CreateProductCommand command, CancellationToken ct = default)
    {
        var product = Product.Create(command.Sku, command.Name, command.Price);
        await repository.AddAsync(product, ct);
        await repository.SaveChangesAsync(ct);
        return ToDto(product);
    }

    public async Task<IReadOnlyList<ProductDto>> ListAsync(CancellationToken ct = default)
    {
        var items = await repository.ListActiveAsync(ct);
        return items.Select(ToDto).ToList();
    }

    public async Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var product = await repository.GetByIdAsync(id, ct);
        return product is null || !product.IsActive ? null : ToDto(product);
    }

    private static ProductDto ToDto(Product p) => new(p.Id, p.Sku, p.Name, p.Price, p.IsActive);
}

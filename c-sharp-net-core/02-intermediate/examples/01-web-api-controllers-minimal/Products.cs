namespace ControllersVsMinimal;

public sealed record ProductDto(Guid Id, string Sku, string Name, decimal Price);
public sealed record CreateProductRequest(string Sku, string Name, decimal Price);

public interface IProductStore
{
    Task<IReadOnlyList<ProductDto>> ListAsync(CancellationToken ct = default);
    Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
}

public sealed class InMemoryProductStore : IProductStore
{
    private readonly List<ProductDto> _items =
    [
        new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "SKU-1", "Notebook", 120m)
    ];

    public Task<IReadOnlyList<ProductDto>> ListAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<ProductDto>>(_items.ToList());

    public Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(_items.FirstOrDefault(x => x.Id == id));

    public Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Sku))
            throw new ArgumentException("Sku is required.", nameof(request));

        var created = new ProductDto(Guid.NewGuid(), request.Sku.Trim(), request.Name.Trim(), request.Price);
        _items.Add(created);
        return Task.FromResult(created);
    }
}

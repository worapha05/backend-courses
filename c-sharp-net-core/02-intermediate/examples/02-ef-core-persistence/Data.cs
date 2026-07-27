using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace EfCorePersistence;

public sealed class Product
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [MaxLength(64)]
    public required string Sku { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    [MaxLength(100)]
    public required string Category { get; set; }

    public decimal Price { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Sku).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.Sku).IsUnique();
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Category).HasMaxLength(100).IsRequired();
            e.Property(x => x.Price).HasPrecision(18, 2);
        });
    }
}

public sealed record ProductDto(Guid Id, string Sku, string Name, string Category, decimal Price);
public sealed record CreateProductRequest(string Sku, string Name, string Category, decimal Price);
public sealed record ProductQuery(string? Search, string? Category, int Page = 1, int PageSize = 20);

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> SearchAsync(ProductQuery query, CancellationToken ct = default);
    Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
}

public sealed class ProductService(AppDbContext db) : IProductService
{
    public async Task<IReadOnlyList<ProductDto>> SearchAsync(ProductQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var size = Math.Clamp(query.PageSize, 1, 100);

        var q = db.Products.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            q = q.Where(p => p.Name.Contains(term) || p.Sku.Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
            q = q.Where(p => p.Category == query.Category);

        return await q
            .OrderBy(p => p.Name)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(p => new ProductDto(p.Id, p.Sku, p.Name, p.Category, p.Price))
            .ToListAsync(ct);
    }

    public async Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Products.AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProductDto(p.Id, p.Sku, p.Name, p.Category, p.Price))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        var entity = new Product
        {
            Sku = request.Sku.Trim(),
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price
        };

        db.Products.Add(entity);
        await db.SaveChangesAsync(ct);

        return new ProductDto(entity.Id, entity.Sku, entity.Name, entity.Category, entity.Price);
    }
}

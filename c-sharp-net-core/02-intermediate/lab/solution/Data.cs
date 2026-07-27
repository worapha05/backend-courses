using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace CatalogApi;

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
    public bool IsActive { get; set; } = true;
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
            e.Property(x => x.IsActive).HasDefaultValue(true);
        });
    }
}

public static class DbSeed
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Products.AnyAsync()) return;

        db.Products.AddRange(
            new Product { Sku = "USB-HUB", Name = "USB-C Hub", Category = "Electronics", Price = 890m },
            new Product { Sku = "CAM-1080", Name = "Webcam 1080p", Category = "Electronics", Price = 1290m },
            new Product { Sku = "NOTE-A5", Name = "Notebook A5", Category = "Stationery", Price = 120m },
            new Product { Sku = "PEN-GEL", Name = "Gel Pen", Category = "Stationery", Price = 25m },
            new Product { Sku = "DESK-MAT", Name = "Desk Mat", Category = "Office", Price = 450m });

        await db.SaveChangesAsync();
    }
}

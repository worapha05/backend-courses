namespace Catalog.Domain;

public sealed class Product
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Sku { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public decimal Price { get; private set; }
    public bool IsActive { get; private set; } = true;

    private Product() { } // EF

    public static Product Create(string sku, string name, decimal price)
    {
        if (string.IsNullOrWhiteSpace(sku)) throw new ArgumentException("Sku required.");
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name required.");
        if (price <= 0) throw new ArgumentOutOfRangeException(nameof(price));

        return new Product
        {
            Sku = sku.Trim(),
            Name = name.Trim(),
            Price = price
        };
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name required.");
        Name = name.Trim();
    }

    public void Deactivate() => IsActive = false;
}

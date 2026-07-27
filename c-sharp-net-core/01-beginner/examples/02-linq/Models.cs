namespace LinqDemo;

public sealed record Product(int Id, string Name, string Category, decimal Price);
public sealed record OrderLine(string Sku, string Category, int Quantity, decimal UnitPrice);
public sealed record Order(int Id, IReadOnlyList<OrderLine> Lines);
public sealed record Customer(string Name, string Email);
public sealed record CategoryRevenue(string Category, decimal Total);

public static class SampleData
{
    public static IReadOnlyList<Product> CreateCatalog() =>
    [
        new(1, "USB-C Hub", "Electronics", 890m),
        new(2, "Mechanical Keyboard", "Electronics", 3200m),
        new(3, "Notebook A5", "Stationery", 120m),
        new(4, "Webcam 1080p", "Electronics", 1290m),
        new(5, "Desk Mat", "Stationery", 450m)
    ];

    public static IReadOnlyList<Order> CreateOrders() =>
    [
        new(1001,
        [
            new("SKU-1", "Electronics", 2, 890m),
            new("SKU-3", "Stationery", 5, 120m)
        ]),
        new(1002,
        [
            new("SKU-2", "Electronics", 1, 3200m),
            new("SKU-5", "Stationery", 2, 450m)
        ])
    ];

    public static IReadOnlyList<Customer> CreateCustomers() =>
    [
        new("Ann", "ann@example.com"),
        new("Bob", "bob@example.com"),
        new("Ann Duplicate", "ANN@example.com")
    ];
}

public static class DeferredExecutionDemo
{
    public static void Run()
    {
        var numbers = new List<int> { 1, 2, 3, 4, 5 };

        // Lazy: Where does not run until enumerated.
        var query = numbers.Where(n =>
        {
            Console.WriteLine($"  filtering {n}");
            return n % 2 == 0;
        });

        Console.WriteLine("Query defined (no filter yet).");

        Console.WriteLine("First enumeration:");
        _ = query.ToList();

        Console.WriteLine("Second enumeration (runs again — multiple enumeration):");
        _ = query.Count();

        // Snapshot once when you need stable/reusable results.
        var snapshot = numbers.Where(n => n % 2 == 0).ToList();
        Console.WriteLine($"Snapshot materialised once, count={snapshot.Count}");
    }
}

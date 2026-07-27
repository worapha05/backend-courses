using LinqDemo;

var catalog = SampleData.CreateCatalog();

Console.WriteLine("=== Method syntax: cheap electronics ===");
var cheapMethod = catalog
    .Where(p => p.Category == "Electronics" && p.Price < 1500)
    .OrderBy(p => p.Price)
    .Select(p => $"{p.Name} @ {p.Price:C}");

foreach (var line in cheapMethod)
    Console.WriteLine(line);

Console.WriteLine("\n=== Query syntax: equivalent ===");
var cheapQuery =
    from p in catalog
    where p.Category == "Electronics" && p.Price < 1500
    orderby p.Price
    select $"{p.Name} @ {p.Price:C}";

foreach (var line in cheapQuery)
    Console.WriteLine(line);

Console.WriteLine("\n=== Deferred execution demo ===");
DeferredExecutionDemo.Run();

Console.WriteLine("\n=== SelectMany + GroupBy (order lines → revenue by category) ===");
var orders = SampleData.CreateOrders();
var revenue = orders
    .SelectMany(o => o.Lines)
    .GroupBy(l => l.Category)
    .Select(g => new CategoryRevenue(g.Key, g.Sum(x => x.Quantity * x.UnitPrice)))
    .OrderByDescending(x => x.Total);

foreach (var row in revenue)
    Console.WriteLine($"{row.Category}: {row.Total:C}");

Console.WriteLine("\n=== DistinctBy emails ===");
var emails = SampleData.CreateCustomers()
    .DistinctBy(c => c.Email.ToLowerInvariant())
    .Select(c => c.Email);

foreach (var email in emails)
    Console.WriteLine(email);

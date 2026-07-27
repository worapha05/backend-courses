using ModernCsharpDemo;

Console.WriteLine("=== Primary Constructor ===");
var pricing = new PricingService(taxRate: 0.07m);
Console.WriteLine(pricing.TotalWithTax(100m));

Console.WriteLine("\n=== Records & with-expression ===");
var money = new Money(100m, "THB");
var more = money.Add(new Money(50m, "THB"));
var usdAttempt = money with { Currency = "USD" };
Console.WriteLine($"{money} + 50 = {more}");
Console.WriteLine($"Copy with new currency: {usdAttempt}");

Console.WriteLine("\n=== Pattern Matching ===");
Shape[] shapes =
[
    new Circle(2),
    new Rectangle(4, 4),
    new Rectangle(3, 5),
    new Circle(0)
];

foreach (var shape in shapes)
    Console.WriteLine(ShapeDescriber.Describe(shape));

Console.WriteLine("\n=== Collection Patterns ===");
int[] empty = [];
int[] one = [42];
int[] many = [1, 2, 3, 4];
Console.WriteLine(CollectionPatterns.Summarize(empty));
Console.WriteLine(CollectionPatterns.Summarize(one));
Console.WriteLine(CollectionPatterns.Summarize(many));

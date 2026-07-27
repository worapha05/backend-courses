namespace ModernCsharpDemo;

public sealed class PricingService(decimal taxRate)
{
    public decimal TotalWithTax(decimal net) =>
        Math.Round(net * (1 + taxRate), 2, MidpointRounding.AwayFromZero);
}

public sealed record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (!string.Equals(Currency, other.Currency, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Cannot add {other.Currency} to {Currency}.");

        return this with { Amount = Amount + other.Amount };
    }

    public override string ToString() => $"{Amount:0.00} {Currency}";
}

public abstract record Shape;
public sealed record Circle(double Radius) : Shape;
public sealed record Rectangle(double Width, double Height) : Shape;

public static class ShapeDescriber
{
    public static string Describe(Shape shape) => shape switch
    {
        Circle { Radius: <= 0 } => "Invalid circle",
        Circle { Radius: var r } => $"Circle area ≈ {Math.PI * r * r:0.00}",
        Rectangle { Width: var w, Height: var h } when Math.Abs(w - h) < 0.0001 => $"Square side={w}",
        Rectangle(var w, var h) => $"Rectangle {w}x{h}",
        _ => "Unknown shape"
    };
}

public static class CollectionPatterns
{
    public static string Summarize(int[] values) => values switch
    {
        [] => "empty",
        [var only] => $"single:{only}",
        [var head, .. var rest] => $"head={head}, restCount={rest.Length}"
    };
}

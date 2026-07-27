namespace Orders.Domain;

public enum OrderStatus
{
    Pending = 0,
    Paid = 1,
    Cancelled = 2
}

public sealed class Customer
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public string Email { get; private set; } = null!;

    private Customer() { }

    public static Customer Create(string name, string email)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name required.");
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email required.");

        return new Customer { Name = name.Trim(), Email = email.Trim().ToLowerInvariant() };
    }
}

public sealed class OrderLine
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrderId { get; private set; }
    public string Sku { get; private set; } = null!;
    public int Quantity { get; private set; }
    public decimal UnitPrice { get; private set; }

    private OrderLine() { }

    internal static OrderLine Create(string sku, int quantity, decimal unitPrice)
    {
        if (string.IsNullOrWhiteSpace(sku)) throw new ArgumentException("Sku required.");
        if (quantity <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        if (unitPrice <= 0) throw new ArgumentOutOfRangeException(nameof(unitPrice));

        return new OrderLine
        {
            Sku = sku.Trim(),
            Quantity = quantity,
            UnitPrice = unitPrice
        };
    }

    public decimal LineTotal => Quantity * UnitPrice;
}

public sealed class Order
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
    public OrderStatus Status { get; private set; } = OrderStatus.Pending;

    public List<OrderLine> Lines { get; private set; } = [];

    private Order() { }

    public static Order Create(Guid customerId, IEnumerable<(string Sku, int Qty, decimal UnitPrice)> lines)
    {
        var order = new Order { CustomerId = customerId };
        foreach (var (sku, qty, price) in lines)
            order.Lines.Add(OrderLine.Create(sku, qty, price));

        if (order.Lines.Count == 0)
            throw new InvalidOperationException("Order must have at least one line.");

        return order;
    }

    public decimal Total => Lines.Sum(l => l.LineTotal);

    public void MarkPaid()
    {
        if (Status == OrderStatus.Cancelled)
            throw new InvalidOperationException("Cancelled order cannot be paid.");
        Status = OrderStatus.Paid;
    }
}

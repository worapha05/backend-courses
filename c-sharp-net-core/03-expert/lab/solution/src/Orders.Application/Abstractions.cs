using Orders.Domain;

namespace Orders.Application;

public sealed record OrderListItem(
    Guid Id,
    string CustomerName,
    string Status,
    decimal Total,
    int LineCount);

public sealed record CreateOrderLine(string Sku, int Quantity, decimal UnitPrice);

public sealed record CreateOrderCommand(Guid CustomerId, IReadOnlyList<CreateOrderLine> Lines);

public sealed record DashboardSummary(int CustomerCount, int OrderCount, decimal Revenue);

public enum ExportStatus { Queued, Running, Completed, Failed }

public sealed record ExportJob(Guid Id, string RequestedBy, DateTimeOffset CreatedAt);

public sealed record ExportJobState(
    Guid Id,
    ExportStatus Status,
    string RequestedBy,
    DateTimeOffset CreatedAt,
    string? FilePath,
    string? Error);

public interface IOrderRepository
{
    Task AddAsync(Order order, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IOrderQueryService
{
    Task<IReadOnlyList<OrderListItem>> ListAsync(CancellationToken ct = default);
    Task<DashboardSummary> GetSummaryAsync(CancellationToken ct = default);
}

public interface IExportQueue
{
    ValueTask EnqueueAsync(ExportJob job, CancellationToken ct = default);
    ValueTask<ExportJob> DequeueAsync(CancellationToken ct = default);
}

public interface IExportStore
{
    void Set(ExportJobState state);
    ExportJobState? Get(Guid id);
}

public interface IOrderAppService
{
    Task<OrderListItem> CreateAsync(CreateOrderCommand command, CancellationToken ct = default);
    Task<IReadOnlyList<OrderListItem>> ListAsync(CancellationToken ct = default);
    Task<DashboardSummary> GetDashboardAsync(CancellationToken ct = default);
    Task<Guid> EnqueueExportAsync(string requestedBy, CancellationToken ct = default);
    ExportJobState? GetExport(Guid jobId);
}

public sealed class OrderAppService(
    IOrderRepository repository,
    IOrderQueryService queries,
    IExportQueue exportQueue,
    IExportStore exportStore) : IOrderAppService
{
    public async Task<OrderListItem> CreateAsync(CreateOrderCommand command, CancellationToken ct = default)
    {
        var order = Order.Create(
            command.CustomerId,
            command.Lines.Select(l => (l.Sku, l.Quantity, l.UnitPrice)));

        await repository.AddAsync(order, ct);
        await repository.SaveChangesAsync(ct);

        // Re-read via query projection for consistent DTO shape.
        var list = await queries.ListAsync(ct);
        return list.First(x => x.Id == order.Id);
    }

    public Task<IReadOnlyList<OrderListItem>> ListAsync(CancellationToken ct = default) =>
        queries.ListAsync(ct);

    public Task<DashboardSummary> GetDashboardAsync(CancellationToken ct = default) =>
        queries.GetSummaryAsync(ct);

    public async Task<Guid> EnqueueExportAsync(string requestedBy, CancellationToken ct = default)
    {
        var job = new ExportJob(Guid.NewGuid(), requestedBy, DateTimeOffset.UtcNow);
        exportStore.Set(new ExportJobState(job.Id, ExportStatus.Queued, job.RequestedBy, job.CreatedAt, null, null));
        await exportQueue.EnqueueAsync(job, ct);
        return job.Id;
    }

    public ExportJobState? GetExport(Guid jobId) => exportStore.Get(jobId);
}

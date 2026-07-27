using System.Threading.Channels;
using ClosedXML.Excel;

namespace SerilogBackgroundExcel;

public enum ExportStatus { Queued, Running, Completed, Failed }

public sealed record ExportJob(Guid Id, string RequestedBy, DateTimeOffset CreatedAt);
public sealed record ExportJobState(
    Guid Id,
    ExportStatus Status,
    string RequestedBy,
    DateTimeOffset CreatedAt,
    string? FilePath,
    string? Error);

public interface IExportQueue
{
    ValueTask EnqueueAsync(ExportJob job, CancellationToken ct = default);
    ValueTask<ExportJob> DequeueAsync(CancellationToken ct = default);
}

public sealed class InMemoryExportQueue : IExportQueue
{
    private readonly Channel<ExportJob> _channel = Channel.CreateUnbounded<ExportJob>();

    public ValueTask EnqueueAsync(ExportJob job, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync(job, ct);

    public ValueTask<ExportJob> DequeueAsync(CancellationToken ct = default) =>
        _channel.Reader.ReadAsync(ct);
}

public interface IExportStore
{
    void Set(ExportJobState state);
    ExportJobState? Get(Guid id);
}

public sealed class FileExportStore : IExportStore
{
    private readonly Dictionary<Guid, ExportJobState> _states = new();
    private readonly object _gate = new();

    public void Set(ExportJobState state)
    {
        lock (_gate) _states[state.Id] = state;
    }

    public ExportJobState? Get(Guid id)
    {
        lock (_gate) return _states.GetValueOrDefault(id);
    }
}

public static class OrderExportData
{
    public static IReadOnlyList<(string OrderId, string Customer, decimal Total)> Rows() =>
    [
        ("ORD-1001", "Alice", 2260m),
        ("ORD-1002", "Bob", 1290m),
        ("ORD-1003", "Carol", 890m),
        ("ORD-1004", "Dave", 450m)
    ];
}

public static class ExcelExporter
{
    public static async Task<string> ExportOrdersAsync(string directory, Guid jobId, CancellationToken ct)
    {
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, $"orders-{jobId:N}.xlsx");

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Orders");
        sheet.Cell(1, 1).Value = "OrderId";
        sheet.Cell(1, 2).Value = "Customer";
        sheet.Cell(1, 3).Value = "Total";
        sheet.Range(1, 1, 1, 3).Style.Font.Bold = true;

        var row = 2;
        foreach (var item in OrderExportData.Rows())
        {
            ct.ThrowIfCancellationRequested();
            sheet.Cell(row, 1).Value = item.OrderId;
            sheet.Cell(row, 2).Value = item.Customer;
            sheet.Cell(row, 3).Value = item.Total;
            row++;
        }

        sheet.Columns().AdjustToContents();
        await Task.Run(() => workbook.SaveAs(path), ct);
        return path;
    }
}

public sealed class ExportBackgroundService(
    IExportQueue queue,
    IExportStore store,
    IHostEnvironment env,
    ILogger<ExportBackgroundService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Export background worker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            var job = await queue.DequeueAsync(stoppingToken);
            store.Set(new ExportJobState(job.Id, ExportStatus.Running, job.RequestedBy, job.CreatedAt, null, null));

            try
            {
                var dir = Path.Combine(env.ContentRootPath, "exports");
                var path = await ExcelExporter.ExportOrdersAsync(dir, job.Id, stoppingToken);
                store.Set(new ExportJobState(job.Id, ExportStatus.Completed, job.RequestedBy, job.CreatedAt, path, null));

                logger.LogInformation(
                    "OrderExported {JobId} by {UserId} path={Path}",
                    job.Id, job.RequestedBy, path);
            }
            catch (Exception ex)
            {
                store.Set(new ExportJobState(job.Id, ExportStatus.Failed, job.RequestedBy, job.CreatedAt, null, ex.Message));
                logger.LogError(ex, "OrderExportFailed {JobId}", job.Id);
            }
        }
    }
}

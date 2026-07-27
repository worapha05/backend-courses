using Microsoft.AspNetCore.Mvc;

namespace SerilogBackgroundExcel;

[ApiController]
[Route("api/exports")]
public sealed class ExportsController(
    IExportQueue queue,
    IExportStore store,
    ILogger<ExportsController> logger) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Enqueue([FromQuery] string requestedBy = "demo-user", CancellationToken ct = default)
    {
        var job = new ExportJob(Guid.NewGuid(), requestedBy, DateTimeOffset.UtcNow);
        store.Set(new ExportJobState(job.Id, ExportStatus.Queued, job.RequestedBy, job.CreatedAt, null, null));
        await queue.EnqueueAsync(job, ct);

        logger.LogInformation("OrderExportQueued {JobId} by {UserId}", job.Id, requestedBy);
        return Accepted(new { jobId = job.Id, status = ExportStatus.Queued });
    }

    [HttpGet("{jobId:guid}")]
    public ActionResult<object> Status(Guid jobId)
    {
        var state = store.Get(jobId);
        return state is null ? NotFound() : Ok(state);
    }

    [HttpGet("{jobId:guid}/download")]
    public IActionResult Download(Guid jobId)
    {
        var state = store.Get(jobId);
        if (state is null) return NotFound();
        if (state.Status != ExportStatus.Completed || state.FilePath is null || !System.IO.File.Exists(state.FilePath))
            return Conflict(new { status = state.Status, message = "Export not ready." });

        var bytes = System.IO.File.ReadAllBytes(state.FilePath);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Path.GetFileName(state.FilePath));
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Orders.Application;

namespace Orders.Api;

public sealed class JwtSettings
{
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required string Key { get; init; }
}

public sealed record AppUser(Guid Id, string Email, string Password, string Role, IReadOnlyList<string> Permissions);

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(string AccessToken, string Email, string Role);

public interface IUserStore
{
    AppUser? FindByEmail(string email);
}

public sealed class InMemoryUserStore : IUserStore
{
    private readonly List<AppUser> _users =
    [
        new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "admin@example.com", "Passw0rd!", "Admin", []),
        new(Guid.Parse("22222222-2222-2222-2222-222222222222"), "manager@example.com", "Passw0rd!", "Manager", ["orders:export"]),
        new(Guid.Parse("33333333-3333-3333-3333-333333333333"), "viewer@example.com", "Passw0rd!", "Viewer", [])
    ];

    public AppUser? FindByEmail(string email) =>
        _users.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
}

public interface ITokenService
{
    LoginResponse Create(AppUser user);
}

public sealed class TokenService(JwtSettings jwt) : ITokenService
{
    public LoginResponse Create(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role)
        };
        claims.AddRange(user.Permissions.Select(p => new Claim("permission", p)));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));
        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), user.Email, user.Role);
    }
}

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IUserStore users, ITokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        var user = users.FindByEmail(request.Email);
        if (user is null || user.Password != request.Password)
            return Unauthorized();
        return Ok(tokens.Create(user));
    }
}

[ApiController]
[Route("api/orders")]
public sealed class OrdersController(IOrderAppService orders) : ControllerBase
{
    [Authorize(Policy = "Orders.Read")]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OrderListItem>>> List(CancellationToken ct) =>
        Ok(await orders.ListAsync(ct));

    [Authorize(Policy = "Orders.Write")]
    [HttpPost]
    public async Task<ActionResult<OrderListItem>> Create([FromBody] CreateOrderCommand command, CancellationToken ct)
    {
        var created = await orders.CreateAsync(command, ct);
        return CreatedAtAction(nameof(List), created);
    }
}

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(IOrderAppService orders) : ControllerBase
{
    [Authorize(Policy = "Orders.Read")]
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummary>> Summary(CancellationToken ct) =>
        Ok(await orders.GetDashboardAsync(ct));
}

[ApiController]
[Route("api/exports")]
public sealed class ExportsController(IOrderAppService orders, ILogger<ExportsController> logger) : ControllerBase
{
    [Authorize(Policy = "Orders.Export")]
    [HttpPost("orders")]
    public async Task<IActionResult> Enqueue(CancellationToken ct)
    {
        var user = User.FindFirstValue(ClaimTypes.Email) ?? "unknown";
        var jobId = await orders.EnqueueExportAsync(user, ct);
        logger.LogInformation("OrderExportQueued {JobId} by {UserId}", jobId, user);
        return Accepted(new { jobId, status = ExportStatus.Queued });
    }

    [Authorize(Policy = "Orders.Export")]
    [HttpGet("{jobId:guid}")]
    public ActionResult<object> Status(Guid jobId)
    {
        var state = orders.GetExport(jobId);
        return state is null ? NotFound() : Ok(state);
    }

    [Authorize(Policy = "Orders.Export")]
    [HttpGet("{jobId:guid}/download")]
    public IActionResult Download(Guid jobId)
    {
        var state = orders.GetExport(jobId);
        if (state is null) return NotFound();
        if (state.Status != ExportStatus.Completed || state.FilePath is null || !System.IO.File.Exists(state.FilePath))
            return Conflict(new { status = state.Status, message = "Export not ready." });

        var bytes = System.IO.File.ReadAllBytes(state.FilePath);
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            Path.GetFileName(state.FilePath));
    }
}

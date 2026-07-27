using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RbacPolicyDemo;

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
public sealed class OrdersController : ControllerBase
{
    [Authorize(Policy = "Orders.Read")]
    [HttpGet]
    public ActionResult<object> List() =>
        Ok(new[] { new { id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), total = 1500 } });

    [Authorize(Policy = "Orders.Write")]
    [HttpPost]
    public ActionResult<object> Create() =>
        Created("/api/orders/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", new { id = Guid.NewGuid() });

    [Authorize(Policy = "Orders.Export")]
    [HttpPost("export")]
    public ActionResult<object> Export() =>
        Accepted(new { jobId = Guid.NewGuid(), message = "Export authorized by policy." });

    [Authorize(Policy = "Orders.OwnerOrAdmin")]
    [HttpGet("mine")]
    public ActionResult<object> Mine() =>
        Ok(new { message = "Owner-or-Admin policy passed." });
}

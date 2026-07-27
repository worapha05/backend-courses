using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CorsValidationJwt;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IUserStore users, ITokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        var user = users.FindByEmail(request.Email);
        if (user is null || user.Password != request.Password)
            return Unauthorized(new { title = "Invalid email or password." });

        return Ok(tokens.CreateToken(user));
    }
}

[ApiController]
[Route("api/secure")]
public sealed class SecureController : ControllerBase
{
    [Authorize]
    [HttpGet("me")]
    public ActionResult<object> Me()
    {
        return Ok(new
        {
            sub = User.FindFirstValue(ClaimTypes.NameIdentifier),
            email = User.FindFirstValue(ClaimTypes.Email),
            role = User.FindFirstValue(ClaimTypes.Role)
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin-only")]
    public ActionResult<object> AdminOnly() => Ok(new { message = "Welcome, Admin." });

    [Authorize]
    [HttpPost("notes")]
    public ActionResult<object> CreateNote([FromBody] CreateNoteRequest request) =>
        Ok(new { id = Guid.NewGuid(), request.Title, request.Body });
}

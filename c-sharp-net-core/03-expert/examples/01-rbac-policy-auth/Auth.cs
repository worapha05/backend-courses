using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace RbacPolicyDemo;

public sealed class JwtSettings
{
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required string Key { get; init; }
}

public sealed record AppUser(
    Guid Id,
    string Email,
    string Password,
    string Role,
    IReadOnlyList<string> Permissions);

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

public sealed class OrderOwnerOrAdminRequirement : IAuthorizationRequirement;

public sealed class OrderOwnerOrAdminHandler : AuthorizationHandler<OrderOwnerOrAdminRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OrderOwnerOrAdminRequirement requirement)
    {
        if (context.User.IsInRole("Admin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Demo: treat NameIdentifier as "owner id" matching route value orderId owner map in controller filter alternative.
        // Here we succeed Managers reading their own demo order only when claim matches fixed demo owner.
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == "22222222-2222-2222-2222-222222222222")
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}

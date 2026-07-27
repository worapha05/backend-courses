using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CatalogApi;

public sealed class JwtSettings
{
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required string Key { get; init; }
    public int ExpiryHours { get; init; } = 8;
}

public sealed record AppUser(Guid Id, string Email, string Password, string Role);
public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, string Email, string Role);

public sealed record ProductDto(Guid Id, string Sku, string Name, string Category, decimal Price, bool IsActive);
public sealed record CreateProductRequest(string Sku, string Name, string Category, decimal Price);
public sealed record UpdateProductRequest(string Name, string Category, decimal Price);
public sealed record ProductQuery(string? Search, string? Category, int Page = 1, int PageSize = 20);

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
    }
}

public sealed class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThan(0);
    }
}

public sealed class UpdateProductRequestValidator : AbstractValidator<UpdateProductRequest>
{
    public UpdateProductRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Price).GreaterThan(0);
    }
}

public interface IUserStore
{
    AppUser? FindByEmail(string email);
}

public sealed class InMemoryUserStore : IUserStore
{
    private readonly List<AppUser> _users =
    [
        new(Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "admin@example.com", "Passw0rd!", "Admin"),
        new(Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), "viewer@example.com", "Passw0rd!", "Viewer")
    ];

    public AppUser? FindByEmail(string email) =>
        _users.FirstOrDefault(u => u.Email.Equals(email, StringComparison.OrdinalIgnoreCase));
}

public interface ITokenService
{
    LoginResponse CreateToken(AppUser user);
}

public sealed class TokenService(JwtSettings jwt) : ITokenService
{
    public LoginResponse CreateToken(AppUser user)
    {
        var expires = DateTimeOffset.UtcNow.AddHours(jwt.ExpiryHours);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Email),
            new(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            expires: expires.UtcDateTime,
            signingCredentials: creds);

        return new LoginResponse(
            new JwtSecurityTokenHandler().WriteToken(token),
            expires,
            user.Email,
            user.Role);
    }
}

public interface IProductService
{
    Task<IReadOnlyList<ProductDto>> SearchAsync(ProductQuery query, CancellationToken ct = default);
    Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default);
    Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default);
    Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken ct = default);
    Task<bool> SoftDeleteAsync(Guid id, CancellationToken ct = default);
}

public sealed class ProductService(AppDbContext db) : IProductService
{
    public async Task<IReadOnlyList<ProductDto>> SearchAsync(ProductQuery query, CancellationToken ct = default)
    {
        var page = Math.Max(1, query.Page);
        var size = Math.Clamp(query.PageSize, 1, 100);

        var q = db.Products.AsNoTracking().Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(p => p.Name.ToLower().Contains(term) || p.Sku.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
            q = q.Where(p => p.Category == query.Category);

        return await q
            .OrderBy(p => p.Name)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(p => new ProductDto(p.Id, p.Sku, p.Name, p.Category, p.Price, p.IsActive))
            .ToListAsync(ct);
    }

    public async Task<ProductDto?> GetAsync(Guid id, CancellationToken ct = default) =>
        await db.Products.AsNoTracking()
            .Where(p => p.Id == id && p.IsActive)
            .Select(p => new ProductDto(p.Id, p.Sku, p.Name, p.Category, p.Price, p.IsActive))
            .FirstOrDefaultAsync(ct);

    public async Task<ProductDto> CreateAsync(CreateProductRequest request, CancellationToken ct = default)
    {
        var entity = new Product
        {
            Sku = request.Sku.Trim(),
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price
        };

        db.Products.Add(entity);
        await db.SaveChangesAsync(ct);
        return new ProductDto(entity.Id, entity.Sku, entity.Name, entity.Category, entity.Price, entity.IsActive);
    }

    public async Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request, CancellationToken ct = default)
    {
        var entity = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.IsActive, ct);
        if (entity is null) return null;

        entity.Name = request.Name.Trim();
        entity.Category = request.Category.Trim();
        entity.Price = request.Price;
        await db.SaveChangesAsync(ct);

        return new ProductDto(entity.Id, entity.Sku, entity.Name, entity.Category, entity.Price, entity.IsActive);
    }

    public async Task<bool> SoftDeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await db.Products.FirstOrDefaultAsync(p => p.Id == id && p.IsActive, ct);
        if (entity is null) return false;

        entity.IsActive = false;
        await db.SaveChangesAsync(ct);
        return true;
    }
}

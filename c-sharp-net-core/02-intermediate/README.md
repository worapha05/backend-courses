# Level 2 — Intermediate: ASP.NET Core Web API & Databases

เป้าหมายระดับนี้: สร้าง **ASP.NET Core Web API** ที่เชื่อมฐานข้อมูลได้จริง
พร้อม CORS, Validation, และ JWT — เป็นสะพานจาก Console/DI สู่ production API

---

## สารบัญ

1. [Controllers vs Minimal APIs](#1-controllers-vs-minimal-apis)
2. [Routing & Model Binding](#2-routing--model-binding)
3. [EF Core — DbContext, Code-First Migrations, Connections](#3-ef-core--dbcontext-code-first-migrations-connections)
4. [Middleware Pipeline](#4-middleware-pipeline)
5. [CORS](#5-cors)
6. [FluentValidation](#6-fluentvalidation)
7. [JWT Authentication & Authorization](#7-jwt-authentication--authorization)
8. [Best Practices สรุป](#8-best-practices-สรุป)

---

## 1. Controllers vs Minimal APIs

ASP.NET Core รองรับสองสไตล์หลัก:

### Controllers (`[ApiController]`)

```csharp
[ApiController]
[Route("api/[controller]")]
public sealed class ProductsController(IProductService products) : ControllerBase
{
 [HttpGet]
 public async Task<ActionResult<IReadOnlyList<ProductDto>>> List(CancellationToken ct) =>
  Ok(await products.ListAsync(ct));

 [HttpGet("{id:guid}")]
 public async Task<ActionResult<ProductDto>> Get(Guid id, CancellationToken ct)
 {
  var item = await products.GetAsync(id, ct);
  return item is null ? NotFound() : Ok(item);
 }

 [HttpPost]
 public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request, CancellationToken ct)
 {
  var created = await products.CreateAsync(request, ct);
  return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
 }
}
```

`[ApiController]` เปิดพฤติกรรมอัตโนมัติ เช่น:

- Binding จาก body สำหรับ complex types
- `400` อัตโนมัติเมื่อ `ModelState` ไม่ valid
- Infer `ProblemDetails` สำหรับ error บางชนิด

### Minimal APIs

```csharp
var group = app.MapGroup("/api/products").WithTags("Products");

group.MapGet("/", async (IProductService svc, CancellationToken ct) =>
 Results.Ok(await svc.ListAsync(ct)));

group.MapGet("/{id:guid}", async (Guid id, IProductService svc, CancellationToken ct) =>
{
 var item = await svc.GetAsync(id, ct);
 return item is null ? Results.NotFound() : Results.Ok(item);
});

group.MapPost("/", async (CreateProductRequest req, IProductService svc, CancellationToken ct) =>
{
 var created = await svc.CreateAsync(req, ct);
 return Results.Created($"/api/products/{created.Id}", created);
});
```

| เลือก            | เมื่อ                                               |
| ---------------- | --------------------------------------------------- |
| **Controllers**  | ทีมใหญ่, action เยอะ, filters/conventions, คุ้น MVC |
| **Minimal APIs** | ไมโครเซอร์วิสเล็ก, vertical slice, ลด ceremony      |
| **ผสม**          | ได้ — ใช้ร่วมในแอปเดียวกันได้                       |

> Best Practice: **business logic ไม่อยู่ใน endpoint** ไม่ว่าจะ Controller หรือ Minimal — อยู่ที่ Service/Application layer

ดูตัวอย่าง: [`examples/01-web-api-controllers-minimal/`](./examples/01-web-api-controllers-minimal/)

---

## 2. Routing & Model Binding

### Route templates

```csharp
[Route("api/orders")]
[HttpGet("{orderId:guid}/lines/{lineId:int}")]
public ActionResult GetLine(Guid orderId, int lineId) => Ok();
```

Constraint ที่ใช้บ่อย: `guid`, `int`, `min(1)`, `regex(...)`, `length(...)`

### Binding sources

| Source   | Attribute        | ตัวอย่าง                   |
| -------- | ---------------- | -------------------------- |
| Route    | `[FromRoute]`    | `/api/items/{id}`          |
| Query    | `[FromQuery]`    | `?page=1&pageSize=20`      |
| Header   | `[FromHeader]`   | `X-Correlation-Id`         |
| Body     | `[FromBody]`     | JSON POST                  |
| Services | `[FromServices]` | inject ใน action parameter |

```csharp
public record ProductQuery(string? Search, string? Category, int Page = 1, int PageSize = 20);

[HttpGet]
public Task<PagedResult<ProductDto>> List([FromQuery] ProductQuery query, CancellationToken ct)
 => products.SearchAsync(query, ct);
```

---

## 3. EF Core — DbContext, Code-First Migrations, Connections

### DbContext

```csharp
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
 public DbSet<Product> Products => Set<Product>();

 protected override void OnModelCreating(ModelBuilder modelBuilder)
 {
  modelBuilder.Entity<Product>(e =>
  {
   e.HasKey(x => x.Id);
   e.Property(x => x.Sku).HasMaxLength(64).IsRequired();
   e.HasIndex(x => x.Sku).IsUnique();
   e.Property(x => x.Price).HasPrecision(18, 2);
  });
 }
}
```

### ลงทะเบียน + Connection

```csharp
// SQLite (เรียนเร็ว)
builder.Services.AddDbContext<AppDbContext>(opt =>
 opt.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// PostgreSQL
// opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"));

// SQL Server
// opt.UseSqlServer(builder.Configuration.GetConnectionString("Default"));
```

```json
{
  "ConnectionStrings": {
    "Default": "Data Source=bootcamp.db"
  }
}
```

### Code-First Migrations

```bash
dotnet tool install --global dotnet-ef # ครั้งแรก
dotnet ef migrations add InitialCreate
dotnet ef database update
```

**Lifetime:** `DbContext` ต้องเป็น **Scoped** (ค่าเริ่มต้นของ `AddDbContext`) — หนึ่งอินสแตนซ์ต่อ HTTP request

ดูตัวอย่าง: [`examples/02-ef-core-persistence/`](./examples/02-ef-core-persistence/)

---

## 4. Middleware Pipeline

Request ไหลเป็นท่อตามลำดับที่ลงทะเบียน:

```
ExceptionHandler → HTTPS → CORS → AuthN → AuthZ → Controllers/Minimal → Response
```

```csharp
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

**ลำดับสำคัญ**

- `UseCors` ต้องอยู่ก่อน endpoint ที่จะข้าม origin
- `UseAuthentication` ก่อน `UseAuthorization`
- Custom middleware ที่อ่าน body ต้องระวังการ rewind stream

---

## 5. CORS

Browser จะบล็อก cross-origin ถ้า API ไม่ส่ง headers ที่ถูกต้อง:

```csharp
builder.Services.AddCors(options =>
{
 options.AddPolicy("Frontend", policy =>
  policy.WithOrigins("http://localhost:3000", "https://app.example.com")
    .AllowAnyHeader()
    .AllowAnyMethod());
});

app.UseCors("Frontend");
```

> Production: ระบุ origin ให้ชัด — หลีกเลี่ยง `AllowAnyOrigin()` ร่วมกับ credentials

---

## 6. FluentValidation

แยก validation ออกจาก DataAnnotations ใน Controller เพื่อให้ทดสอบและ reuse ได้ดี:

```csharp
public sealed class CreateProductValidator : AbstractValidator<CreateProductRequest>
{
 public CreateProductValidator()
 {
  RuleFor(x => x.Sku).NotEmpty().MaximumLength(64);
  RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
  RuleFor(x => x.Price).GreaterThan(0);
 }
}

builder.Services.AddValidatorsFromAssemblyContaining<CreateProductValidator>();
builder.Services.AddFluentValidationAutoValidation();
```

เมื่อ validation ล้มเหลว → `400` พร้อมรายละเอียด field errors

---

## 7. JWT Authentication & Authorization

### ออกโทเค็น (Login)

```csharp
var claims = new List<Claim>
{
 new(ClaimTypes.NameIdentifier, user.Id.ToString()),
 new(ClaimTypes.Email, user.Email),
 new(ClaimTypes.Role, user.Role)
};

var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key));
var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
var token = new JwtSecurityToken(
 issuer: jwtSettings.Issuer,
 audience: jwtSettings.Audience,
 claims: claims,
 expires: DateTime.UtcNow.AddHours(8),
 signingCredentials: creds);
```

### ตรวจโทเค็น (API)

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
 .AddJwtBearer(options =>
 {
  options.TokenValidationParameters = new TokenValidationParameters
  {
   ValidateIssuer = true,
   ValidateAudience = true,
   ValidateLifetime = true,
   ValidateIssuerSigningKey = true,
   ValidIssuer = jwt.Issuer,
   ValidAudience = jwt.Audience,
   IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key))
  };
 });

builder.Services.AddAuthorization();
```

```csharp
[Authorize]
[HttpGet("me")]
public ActionResult<object> Me() =>
 Ok(new { sub = User.FindFirstValue(ClaimTypes.NameIdentifier), email = User.Identity?.Name });

[Authorize(Roles = "Admin")]
[HttpGet("admin-only")]
public IActionResult AdminOnly() => Ok(new { secret = true });
```

Client ส่ง: `Authorization: Bearer <token>`

ดูตัวอย่าง: [`examples/03-cors-validation-jwt/`](./examples/03-cors-validation-jwt/)

---

## 8. Best Practices สรุป

| หัวข้อ     | ทำ                                       | อย่าทำ                                         |
| ---------- | ---------------------------------------- | ---------------------------------------------- |
| Endpoints  | Thin; ส่งงานให้ service                  | เขียน EF query ยาวใน Controller                |
| DbContext  | Scoped + `async` APIs                    | Singleton DbContext / sync-over-async          |
| Secrets    | User Secrets / env vars                  | Commit JWT key จริงลง git                      |
| CORS       | Allowlist origins                        | `AllowAnyOrigin` + cookies                     |
| Validation | FluentValidation ที่ขอบเขต input         | เชื่อ client แล้ว validate ช้าใน DB อย่างเดียว |
| JWT        | ตั้ง Issuer/Audience/Lifetime/SigningKey | อ่านแค่ decode โดยไม่ validate signature       |

---

## โครงสร้าง folder ระดับนี้

```
02-intermediate/
├── README.md
├── LAB.md
├── examples/
│ ├── 01-web-api-controllers-minimal/
│ ├── 02-ef-core-persistence/
│ └── 03-cors-validation-jwt/
└── lab/solution/
```

**ขั้นถัดไป:** ทำ Lab ใน [`LAB.md`](./LAB.md) แล้วไป [`../03-expert/`](../03-expert/)

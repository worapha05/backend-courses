# Level 3 — Expert: Enterprise Security, Scale & Clean Architecture

เป้าหมายระดับนี้: ออกแบบ API ระดับองค์กร — **ปลอดภัย วัดผลได้ ขยายได้**
ด้วย RBAC/Policies, EF Core ที่ไม่ช้า, Observability, Background jobs และ Clean Architecture

---

## สารบัญ

1. [Advanced Security — RBAC & Policy-based Authorization](#1-advanced-security--rbac--policy-based-authorization)
2. [Token Validation Mechanics](#2-token-validation-mechanics)
3. [High-Performance EF Core — N+1, Include vs Select, AsNoTracking](#3-high-performance-ef-core--n1-include-vs-select-asnotracking)
4. [Async Composition — async/await & Task.WhenAll](#4-async-composition--asyncawait--taskwhenall)
5. [Structured Logging ด้วย Serilog (Audit Logs)](#5-structured-logging-ด้วย-serilog-audit-logs)
6. [Background Tasks — IHostedService / BackgroundService](#6-background-tasks--ihostedservice--backgroundservice)
7. [Excel Export — ClosedXML](#7-excel-export--closedxml)
8. [Clean / Onion Architecture](#8-clean--onion-architecture)
9. [Best Practices สรุป](#9-best-practices-สรุป)

---

## 1. Advanced Security — RBAC & Policy-based Authorization

### RBAC (Role-Based Access Control)

ผูกสิทธิ์กับ **บทบาท** เช่น `Admin`, `Manager`, `Viewer`:

```csharp
[Authorize(Roles = "Admin,Manager")]
[HttpDelete("{id:guid}")]
public IActionResult SoftDelete(Guid id) => NoContent();
```

ข้อจำกัดของ Roles อย่างเดียว: เมื่อกฎซับซ้อนขึ้น (`"Manager ของแผนกตัวเอง"` / `"เจ้าของเอกสารหรือ Admin"`) การใส่ role หลายตัวจะรกและทดสอบยาก

### Policy-based Authorization

แยก **ชื่อนโยบาย** ออกจาก implementation:

```csharp
builder.Services.AddAuthorization(options =>
{
 options.AddPolicy("Orders.Read", p => p.RequireAuthenticatedUser());
 options.AddPolicy("Orders.Write", p => p.RequireRole("Admin", "Manager"));
 options.AddPolicy("Orders.Export", p =>
 p.RequireAssertion(ctx =>
  ctx.User.IsInRole("Admin") ||
  ctx.User.HasClaim("permission", "orders:export")));
});

[Authorize(Policy = "Orders.Export")]
[HttpPost("export")]
public IActionResult Export() => Accepted();
```

### Custom Requirement + Handler

```csharp
public sealed class MinimumAgeRequirement(int age) : IAuthorizationRequirement
{
 public int Age { get; } = age;
}

public sealed class MinimumAgeHandler : AuthorizationHandler<MinimumAgeRequirement>
{
 protected override Task HandleRequirementAsync(
 AuthorizationHandlerContext context,
 MinimumAgeRequirement requirement)
 {
 var dob = context.User.FindFirst("dob")?.Value;
 if (dob is not null &&
  DateOnly.TryParse(dob, out var date) &&
  date.AddYears(requirement.Age) <= DateOnly.FromDateTime(DateTime.UtcNow))
 {
  context.Succeed(requirement);
 }
 return Task.CompletedTask;
 }
}
```

ดูตัวอย่าง: [`examples/01-rbac-policy-auth/`](./examples/01-rbac-policy-auth/)

---

## 2. Token Validation Mechanics

JWT ที่ “decode ได้” **ไม่เท่ากับ** เชื่อถือได้ — ต้อง validate:

| การตรวจ                    | ความหมาย                                       |
| -------------------------- | ---------------------------------------------- |
| `ValidateIssuerSigningKey` | ลายเซ็นถูกต้องด้วย secret/cert ของเรา          |
| `ValidateIssuer`           | ออกโดย issuer ที่ไว้ใจ                         |
| `ValidateAudience`         | ออกสำหรับ API นี้                              |
| `ValidateLifetime`         | ยังไม่หมดอายุ (`exp`)                          |
| `ClockSkew`                | เผื่อเวลา clock drift (อย่าตั้งใหญ่เกินจำเป็น) |

เพิ่มเติมในระบบจริง:

- ใช้ **short-lived access token** + refresh token rotation
- เก็บ signing key ใน secret store / Key Vault
- พิจารณา `jti` + denylist เมื่อต้องการ revoke ก่อนหมดอายุ

---

## 3. High-Performance EF Core — N+1, Include vs Select, AsNoTracking

### ปัญหา N+1

```csharp
// แย่: 1 query ดึง orders + N query ดึง customer ใน loop
var orders = await db.Orders.ToListAsync();
foreach (var o in orders)
 Console.WriteLine(o.Customer.Name); // lazy load หรือ query เพิ่ม
```

### แก้ด้วย `Include` (เมื่อต้องการ entity graph)

```csharp
var orders = await db.Orders
 .Include(o => o.Customer)
 .Include(o => o.Lines)
 .AsNoTracking()
 .ToListAsync();
```

### แก้ด้วย `Select` (แนะนำเมื่อต้องการ DTO)

```csharp
// SQLite ไม่รองรับ Sum(decimal) ใน SQL — cast เป็น double ก่อนแล้วแปลงกลับ
var rows = await db.Orders.AsNoTracking()
 .Select(o => new
 {
 o.Id,
 CustomerName = o.Customer.Name,
 Total = o.Lines.Sum(l => (double)l.Quantity * (double)l.UnitPrice)
 })
 .ToListAsync();

var dto = rows.Select(r => new OrderListItem(r.Id, r.CustomerName, (decimal)r.Total));
```

`Select` มักสร้าง SQL ที่ดึงเฉพาะ column ที่ต้องใช้ — เบากว่า Include ทั้งก้อน

> **SQLite caveat:** provider นี้ไม่รองรับ `Sum(decimal)` ใน SQL — ในตัวอย่าง demo เรา cast เป็น `double` ก่อน aggregate แล้วแปลงกลับเป็น `decimal` ใน DTO (บน PostgreSQL/SQL Server มักใช้ `Sum(decimal)` ได้ตรง ๆ)

| สถานการณ์                     | เลือก                               |
| ----------------------------- | ----------------------------------- |
| อ่านอย่างเดียว → API response | `AsNoTracking` + `Select` เป็น DTO  |
| ต้องการ update entity         | tracking ปกติ (ไม่ใส่ AsNoTracking) |
| กราฟลึกมากและต้อง entity      | `Include` / `ThenInclude` อย่างจงใจ |

ดูตัวอย่าง: [`examples/02-ef-optimization-async/`](./examples/02-ef-optimization-async/)

---

## 4. Async Composition — async/await & Task.WhenAll

```csharp
// แย่: รอทีละอันทั้งที่อิสระต่อกัน
var a = await LoadCustomersAsync();
var b = await LoadProductsAsync();

// ดี: ขนานเมื่อไม่มี dependency
var customersTask = LoadCustomersAsync();
var productsTask = LoadProductsAsync();
await Task.WhenAll(customersTask, productsTask);
var customers = customersTask.Result; // หรือ await อีกครั้งหลัง WhenAll
var products = await productsTask;
```

**ข้อควรระวัง**

- อย่า `WhenAll` บน DbContext เดียวกันแบบ concurrent — EF Core `DbContext` **ไม่ thread-safe**
- ใช้ scope/DbContext แยก หรือรัน sequential สำหรับ EF
- ส่ง `CancellationToken` ตลอดสาย

---

## 5. Structured Logging ด้วย Serilog (Audit Logs)

```csharp
Log.Logger = new LoggerConfiguration()
 .Enrich.FromLogContext()
 .Enrich.WithProperty("Application", "Catalog.Api")
 .WriteTo.Console()
 .WriteTo.File("logs/audit-.log", rollingInterval: RollingInterval.Day)
 .CreateLogger();

builder.Host.UseSerilog();
```

Audit log ควรเป็น **เหตุการณ์ทางธุรกิจ** ที่ค้นได้:

```csharp
logger.LogInformation(
 "OrderExported {OrderId} by {UserId} rows={RowCount}",
 orderId, userId, rowCount);
```

ใช้ message template + properties ไม่ใช่ string interpolation ใน message หลัก เพื่อให้ sink/filter ทำงานได้

---

## 6. Background Tasks — IHostedService / BackgroundService

งานหนัก (export ใหญ่, sync, cleanup) ไม่ควรรอใน HTTP request:

```csharp
public sealed class ExportQueueProcessor(
 IServiceScopeFactory scopeFactory,
 ILogger<ExportQueueProcessor> logger) : BackgroundService
{
 protected override async Task ExecuteAsync(CancellationToken stoppingToken)
 {
 while (!stoppingToken.IsCancellationRequested)
 {
  // dequeue job → create scope → resolve DbContext/services → work
  await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
 }
 }
}

builder.Services.AddHostedService<ExportQueueProcessor>();
builder.Services.AddSingleton<IExportQueue, InMemoryExportQueue>();
```

Pattern ที่ใช้บ่อย: API รับงาน → enqueue → คืน `202 Accepted` + job id → worker ประมวลผล

---

## 7. Excel Export — ClosedXML

```csharp
using var workbook = new XLWorkbook();
var sheet = workbook.Worksheets.Add("Orders");
sheet.Cell(1, 1).Value = "OrderId";
sheet.Cell(1, 2).Value = "Customer";
sheet.Cell(1, 3).Value = "Total";

var row = 2;
foreach (var item in rows)
{
 sheet.Cell(row, 1).Value = item.Id.ToString();
 sheet.Cell(row, 2).Value = item.CustomerName;
 sheet.Cell(row, 3).Value = item.Total;
 row++;
}

await using var stream = new MemoryStream();
workbook.SaveAs(stream);
return stream.ToArray();
```

สำหรับไฟล์ใหญ่: สร้างใน background → เก็บไฟล์/blob → ให้ client download ทีหลัง

ดูตัวอย่าง: [`examples/03-serilog-background-excel/`](./examples/03-serilog-background-excel/)

---

## 8. Clean / Onion Architecture

แยก project ตามความรับผิดชอบ และบังคับทิศทาง dependency **เข้าสู่ศูนย์กลาง (Domain)**:

```
   ┌──────────────────────┐
   │ Catalog.Api │ (Presentation)
   └──────────┬───────────┘
    │
   ┌──────────▼───────────┐
   │ Catalog.Infrastructure│ (EF, JWT, Excel, Serilog)
   └──────────┬───────────┘
    │
   ┌──────────▼───────────┐
   │ Catalog.Application │ (Use cases / ports)
   └──────────┬───────────┘
    │
   ┌──────────▼───────────┐
   │ Catalog.Domain │ (Entities, rules)
   └──────────────────────┘
```

| ชั้น               | มีอะไร                                           | อ้างอิงได้ถึง                                |
| ------------------ | ------------------------------------------------ | -------------------------------------------- |
| **Domain**         | Entities, Value Objects, Domain Events           | ไม่มี (หรือ shared kernel น้อยมาก)           |
| **Application**    | Interfaces (ports), Commands/Queries, Validators | Domain                                       |
| **Infrastructure** | EF Core, File system, Email, JWT                 | Application + Domain                         |
| **Api**            | Controllers, Middleware, DI composition          | Application (+ Infrastructure สำหรับ wiring) |

กฎทอง: **Domain / Application ไม่รู้จัก EF Core, ASP.NET, ClosedXML**

ดูตัวอย่าง: [`examples/04-clean-architecture/`](./examples/04-clean-architecture/)

---

## 9. Best Practices สรุป

| หัวข้อ        | ทำ                                   | อย่าทำ                                                   |
| ------------- | ------------------------------------ | -------------------------------------------------------- |
| Authorization | Policy + permission claims เมื่อกฎโต | Hardcode role กระจายทั่ว controllers                     |
| EF reads      | `AsNoTracking` + project to DTO      | Include ทุกอย่างแล้ว map ทีหลังเสมอ                      |
| Async         | เมื่อ I/O รอได้จริง + token          | `Task.Result` / parallel บน DbContext เดียว              |
| Logging       | Structured properties สำหรับ audit   | Log PII/secrets                                          |
| Heavy work    | Queue + BackgroundService            | Export Excel ใหญ่ใน request thread โดยไม่มี timeout plan |
| Architecture  | Depend inward                        | Domain อ้าง `Microsoft.EntityFrameworkCore`              |

---

## โครงสร้าง folder ระดับนี้

```
03-expert/
├── README.md
├── LAB.md
├── examples/
│ ├── 01-rbac-policy-auth/
│ ├── 02-ef-optimization-async/
│ ├── 03-serilog-background-excel/
│ └── 04-clean-architecture/
└── lab/solution/
```

**ขั้นถัดไป:** ทำ Lab ใน [`LAB.md`](./LAB.md) แล้วสร้าง Portfolio API ของคุณเอง

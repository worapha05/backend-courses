# Level 1 — Beginner: Modern C# & Core .NET

เป้าหมายระดับนี้: ให้คุณเขียน **C# สมัยใหม่** ได้จริง และเข้าใจรากฐานที่ ASP.NET Core พึ่งพา
ไม่ใช่แค่จำ syntax — เพื่อออกแบบโค้ดที่อ่านง่าย ทดสอบได้ และเตรียมพร้อมสำหรับ Web API

---

## สารบัญ

1. [Modern C# (C# 12+) — Primary Constructors, Records, Pattern Matching](#1-modern-c-c-12--primary-constructors-records-pattern-matching)
2. [LINQ — Method vs Query, Deferred Execution, Transformations](#2-linq--method-vs-query-deferred-execution-transformations)
3. [OOP ใน C# — Interfaces, Abstract Classes, Polymorphism](#3-oop-ใน-c--interfaces-abstract-classes-polymorphism)
4. [Dependency Injection Basics](#4-dependency-injection-basics)
5. [Exception Handling แบบ Middleware-minded](#5-exception-handling-แบบ-middleware-minded)
6. [Best Practices สรุป](#6-best-practices-สรุป)

---

## 1. Modern C# (C# 12+) — Primary Constructors, Records, Pattern Matching

### 1.1 Primary Constructors

C# 12 อนุญาตให้ประกาศ parameter ของ constructor ที่ระดับ class/struct ได้ทันที — ลด boilerplate:

```csharp
// แบบดั้งเดิม
public class OrderService
{
 private readonly IOrderRepository _repo;
 private readonly ILogger<OrderService> _logger;

 public OrderService(IOrderRepository repo, ILogger<OrderService> logger)
 {
  _repo = repo;
  _logger = logger;
 }
}

// C# 12 Primary Constructor
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger)
{
 public async Task PlaceAsync(PlaceOrderCommand cmd)
 {
  logger.LogInformation("Placing order for {CustomerId}", cmd.CustomerId);
  await repo.AddAsync(cmd.ToEntity());
 }
}
```

**เมื่อไหร่ควรใช้**

| ใช้ Primary Constructor                   | หลีกเลี่ยงชั่วคราว                                 |
| ----------------------------------------- | -------------------------------------------------- |
| Service / Handler ที่ inject dependencies | Class ที่ต้องการ validation ใน constructor ซับซ้อน |
| DTO / options bag เล็ก ๆ                  | เมื่อต้องการหลาย overload ของ constructor          |

> Best Practice: Primary Constructor parameter เป็น **captured fields โดยนัย** — อย่า mutate parameter เหล่านั้นเป็น state ที่เปลี่ยนบ่อย; ใช้ properties ที่ชัดเจนแทน

ดูตัวอย่างรันได้: [`examples/01-modern-csharp/`](./examples/01-modern-csharp/)

### 1.2 Records — Value-based Equality และ Immutability

`record` / `record class` / `record struct` เหมาะกับข้อมูลที่ “คือค่า” มากกว่า “คือตัวตน”:

```csharp
public sealed record Money(decimal Amount, string Currency)
{
 public Money Add(Money other)
 {
  if (Currency != other.Currency)
   throw new InvalidOperationException("Currency mismatch");
  return this with { Amount = Amount + other.Amount };
 }
}

public sealed record CustomerDto(Guid Id, string Email, string DisplayName);

// with-expression = copy แล้วแก้บาง field (immutable style)
var updated = customer with { DisplayName = "Ada Lovelace" };
```

| ประเภท          | Equality               | ใช้เมื่อ                                         |
| --------------- | ---------------------- | ------------------------------------------------ |
| `class`         | Reference              | Entity ที่มี identity (เช่น มี Id ใน DB)         |
| `record`        | Value (สมาชิกทุกตัว)   | DTO, Command, Event, Value Object                |
| `record struct` | Value + stack-friendly | Value Object เล็ก ๆ ที่ต้องการลด heap allocation |

### 1.3 Pattern Matching

Pattern Matching ทำให้เงื่อนไขอ่านเป็น “ภาษาธุรกิจ” ได้:

```csharp
public static string Describe(object shape) => shape switch
{
 Circle { Radius: > 0 and var r } => $"Circle r={r}",
 Rectangle { Width: var w, Height: var h } when w == h => "Square",
 Rectangle(var w, var h) => $"Rect {w}x{h}",
 null => "empty",
 _ => "unknown"
};

// List / collection patterns (C# 11+)
public static int FirstOrZero(int[] xs) => xs switch
{
 [] => 0,
 [var head, ..] => head
};
```

**Best Practices**

- ใช้ `switch` expression เมื่อทุกสาขาคืนค่าประเภทเดียวกัน
- ใส่ `_` เป็น fallback ที่จงใจ — อย่ากลืน error โดยเงียบ
- ผสม `when` guard เมื่อ property pattern อย่างเดียวไม่พอ

---

## 2. LINQ — Method vs Query, Deferred Execution, Transformations

LINQ คือภาษาสำหรับสอบถามและแปลงลำดับข้อมูลในหน่วยความจำหรือแหล่งข้อมูลอื่น (EF Core จะแปลเป็น SQL ในระดับ Intermediate)

### 2.1 Method Syntax vs Query Syntax

```csharp
var products = GetProducts();

// Method syntax (แนะนำในทีมส่วนใหญ่ — compose ได้ดี)
var cheap = products
 .Where(p => p.Price < 100)
 .OrderBy(p => p.Name)
 .Select(p => new { p.Id, p.Name });

// Query syntax (อ่านคล้าย SQL — ดีเมื่อมี join/let หลายชั้น)
var cheapQ =
 from p in products
 where p.Price < 100
 orderby p.Name
 select new { p.Id, p.Name };
```

ทั้งสองแบบ compile เป็นโค้ดคล้ายกัน — **เลือกสไตล์ให้ทีมสม่ำเสมอ** และใช้ query syntax เมื่อ join ซับซ้อน

### 2.2 Deferred Execution (การเลื่อนการรัน)

ส่วนใหญ่ของ LINQ operators เป็น **lazy**: ยังไม่รันจนกว่าจะ `foreach`, `ToList()`, `Count()`, ฯลฯ

```csharp
IEnumerable<int> query = numbers.Where(n =>
{
 Console.WriteLine($"filter {n}");
 return n % 2 == 0;
});

// ยังไม่พิมพ์อะไร — ยังไม่ execute
var list = query.ToList(); // ตอนนี้ถึงรัน
```

**อันตรายที่พบบ่อย**

1. **Multiple enumeration** — iterate `query` สองครั้ง = รัน filter สองรอบ (หรือยิง SQL สองครั้งถ้าเป็น `IQueryable`)
2. **Side effects ใน Where/Select** — อย่าเขียน log/mutation ใน projection
3. **ปิด connection ก่อน enumerate** — กับ EF Core จะเจอ ObjectDisposedException

```csharp
// ดี: materialize เมื่อต้องการ snapshot
var page = await query.Skip(0).Take(20).ToListAsync();
```

ดูตัวอย่างรันได้: [`examples/02-linq/`](./examples/02-linq/)

### 2.3 Transformations ที่ใช้บ่อยใน Production

| Operator                  | หน้าที่       | ตัวอย่าง              |
| ------------------------- | ------------- | --------------------- |
| `Select`                  | map / project | DTO จาก entity        |
| `Where`                   | filter        | สถานะ Active          |
| `GroupBy`                 | รวมกลุ่ม      | ยอดขายต่อหมวด         |
| `Join` / `GroupJoin`      | รวมชุดข้อมูล  | Order + Customer      |
| `SelectMany`              | flatten       | Order → ทุก OrderLine |
| `Distinct` / `DistinctBy` | ตัดซ้ำ        | อีเมลไม่ซ้ำ           |
| `Chunk`                   | แบ่งชุด       | batch insert ทีละ 500 |

```csharp
var revenueByCategory = orders
 .SelectMany(o => o.Lines)
 .GroupBy(l => l.Category)
 .Select(g => new CategoryRevenue(g.Key, g.Sum(x => x.Qty * x.UnitPrice)));
```

---

## 3. OOP ใน C# — Interfaces, Abstract Classes, Polymorphism

### 3.1 Interface vs Abstract Class

```csharp
public interface IPaymentGateway
{
 Task<PaymentResult> ChargeAsync(Money amount, CancellationToken ct = default);
}

public abstract class PaymentGatewayBase : IPaymentGateway
{
 protected abstract string ProviderName { get; }

 public async Task<PaymentResult> ChargeAsync(Money amount, CancellationToken ct = default)
 {
  if (amount.Amount <= 0)
   throw new ArgumentOutOfRangeException(nameof(amount));
  return await ChargeCoreAsync(amount, ct);
 }

 protected abstract Task<PaymentResult> ChargeCoreAsync(Money amount, CancellationToken ct);
}
```

| เลือก              | เมื่อ                                                                                |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Interface**      | สัญญาที่หลาย implementation ไม่ต้องแชร์โค้ดฐาน; รองรับ multiple inheritance ของสัญญา |
| **Abstract class** | มี algorithm ร่วม (Template Method) และต้องการแชร์ state/protected helpers           |

> ใน .NET สมัยใหม่ มักเริ่มจาก **interface + DI** แล้วค่อยดึงโค้ดซ้ำขึ้น abstract base เมื่อมี pattern ชัด

### 3.2 Polymorphism ที่ปลอดภัย

```csharp
public interface INotifier
{
 Task NotifyAsync(string message, CancellationToken ct = default);
}

public sealed class EmailNotifier : INotifier { /* ... */ }
public sealed class SlackNotifier : INotifier { /* ... */ }

// เรียกผ่าน abstraction — ไม่ผูกกับ concrete
public sealed class AlertService(IEnumerable<INotifier> notifiers)
{
 public async Task BroadcastAsync(string message, CancellationToken ct = default)
 {
  foreach (var n in notifiers)
   await n.NotifyAsync(message, ct);
 }
}
```

ดูตัวอย่างรันได้: [`examples/03-oop-di/`](./examples/03-oop-di/)

---

## 4. Dependency Injection Basics

ASP.NET Core มี DI container ในตัว — แต่แนวคิดใช้ได้กับ Console ด้วย `Host.CreateApplicationBuilder()`

### Lifetimes

| Lifetime      | ความหมาย                                   | ใช้กับ                                                             |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------ |
| **Transient** | สร้างใหม่ทุกครั้งที่ขอ                     | Stateless lightweight services                                     |
| **Scoped**    | หนึ่งอินสแตนซ์ต่อ scope (ต่อ HTTP request) | DbContext, Unit of Work                                            |
| **Singleton** | หนึ่งอินสแตนซ์ทั้งแอป                      | Cache, configuration, HttpClient factory consumers อย่างระมัดระวัง |

```csharp
builder.Services.AddTransient<ITaxCalculator, TaxCalculator>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddSingleton<IClock, SystemClock>();
```

**กฎทอง**

- Singleton **ห้าม** พึ่ง Scoped (เช่น DbContext) โดยตรง — จะกลายเป็น captive dependency
- Prefer inject **interface** ไม่ใช่ concrete ใน application code
- อย่าใช้ Service Locator (`IServiceProvider.GetService`) ใน business logic เป็นค่าเริ่มต้น

---

## 5. Exception Handling แบบ Middleware-minded

แม้ระดับ Beginner จะยังไม่สร้าง Web API เต็มรูปแบบ ให้คิดแบบที่ ASP.NET Core ใช้จริง:

1. **Domain/Application** โยน exception ที่มีความหมาย (`NotFoundException`, `ValidationException`, `ConflictException`)
2. **ขอบเขต HTTP** (Middleware / Exception Handler) แปลงเป็น Problem Details
3. **อย่า** `catch (Exception)` แล้วกลืนเงียบในชั้นใน

```csharp
public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);

// Pseudo middleware (ระดับ Intermediate จะใส่ใน pipeline จริง)
app.UseExceptionHandler(errorApp =>
{
 errorApp.Run(async context =>
 {
  var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;
  context.Response.ContentType = "application/problem+json";
  context.Response.StatusCode = ex switch
  {
   NotFoundException => StatusCodes.Status404NotFound,
   ConflictException => StatusCodes.Status409Conflict,
   ArgumentException => StatusCodes.Status400BadRequest,
   _ => StatusCodes.Status500InternalServerError
  };
  await context.Response.WriteAsJsonAsync(new { title = ex?.Message });
 });
});
```

ในตัวอย่าง Beginner เราจำลอง pipeline นี้ด้วย `ExceptionMiddleware` ใน Console เพื่อให้เห็นแนวคิดก่อนขึ้น Web

---

## 6. Best Practices สรุป

| หัวข้อ     | ทำ                                                     | อย่าทำ                                       |
| ---------- | ------------------------------------------------------ | -------------------------------------------- |
| Data types | ใช้ `record` สำหรับ DTO/Value Object                   | ใช้ mutable class ทุกอย่างโดยไม่คิด equality |
| LINQ       | Materialize (`ToList`/`ToArray`) เมื่อต้องการ snapshot | Enumerate `IQueryable` ซ้ำโดยไม่ตั้งใจ       |
| OOP        | Program to interfaces                                  | `new` concrete dependencies กระจายทั่วโค้ด   |
| DI         | เลือก lifetime ให้ถูก                                  | Singleton กอด DbContext                      |
| Errors     | Exception มีความหมาย + map ที่ขอบเขต                   | catch-all แล้ว return null                   |
| Async      | ใช้ `async/await` ทั้งสาย (ระดับถัดไป)                 | `.Result` / `.Wait()` บล็อก thread           |

---

## โครงสร้าง folder ระดับนี้

```
01-beginner/
├── README.md     ← คุณอยู่ที่นี่
├── LAB.md     ← โจทย์ + เกณฑ์ผ่าน
├── examples/
│ ├── 01-modern-csharp/  ← Primary ctors, records, patterns
│ ├── 02-linq/    ← Method/Query, deferred, transforms
│ └── 03-oop-di/   ← Interfaces, DI host, exception pipeline
└── lab/solution/    ← เฉลย Lab ครบ
```

**ขั้นถัดไป:** ทำ Lab ใน [`LAB.md`](./LAB.md) แล้วไป [`../02-intermediate/`](../02-intermediate/)

# Lab ระดับ Beginner — Mini Inventory Console (Modern C# + LINQ + DI)

## เป้าหมาย

สร้างแอป Console จัดการคลังสินค้าขนาดเล็ก โดยใช้:

- **Records** สำหรับ Product / StockMovement
- **Primary Constructor** ใน services
- **LINQ** สำหรับรายงานสต็อก
- **DI** (`Host.CreateApplicationBuilder`) ลงทะเบียน abstractions
- **Exception pipeline** แปลง domain errors เป็นรหัสสถานะจำลอง

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## โจทย์

### ส่วนที่ 1 — Domain Models

สร้าง:

1. **`Product`** (`record`)

- `Guid Id`
- `string Sku` (ไม่ว่าง)
- `string Name`
- `string Category`
- `decimal UnitPrice` (> 0)
- `int QuantityOnHand` (>= 0)

2. **`StockMovement`** (`record`)

- `Guid ProductId`
- `int Delta` (บวก = รับเข้า, ลบ = จ่ายออก)
- `string Reason`
- `DateTimeOffset At`

3. Exceptions

- `NotFoundException`
- `InsufficientStockException` (map เป็น 409 ใน pipeline)

### ส่วนที่ 2 — Abstractions Services

```csharp
public interface IProductRepository
{
 Task AddAsync(Product product, CancellationToken ct = default);
 Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default);
 Task<IReadOnlyList<Product>> ListAsync(CancellationToken ct = default);
 Task UpdateAsync(Product product, CancellationToken ct = default);
}

public interface IInventoryService
{
 Task<Product> ReceiveAsync(string sku, int qty, string reason, CancellationToken ct = default);
 Task<Product> IssueAsync(string sku, int qty, string reason, CancellationToken ct = default);
 Task<IReadOnlyList<CategoryStock>> GetStockByCategoryAsync(CancellationToken ct = default);
}

public sealed record CategoryStock(string Category, int TotalQty, decimal InventoryValue);
```

- `InMemoryProductRepository` — เก็บใน `List<Product>` (thread-safety ไม่บังคับใน Lab นี้)
- `InventoryService` ใช้ **primary constructor** inject `IProductRepository` + `IClock`
- `IssueAsync` ต้องโยน `InsufficientStockException` ถ้าของไม่พอ
- SKU ไม่พบ → `NotFoundException`

### ส่วนที่ 3 — LINQ Report

`GetStockByCategoryAsync` ต้องใช้ LINQ ประมาณ:

```csharp
products
 .GroupBy(p => p.Category)
 .Select(g => new CategoryStock(
  g.Key,
  g.Sum(p => p.QuantityOnHand),
  g.Sum(p => p.QuantityOnHand * p.UnitPrice)))
 .OrderBy(x => x.Category)
 .ToList();
```

เพิ่ม method (ใน repository หรือ service ก็ได้) ที่หา:

- สินค้าที่ `QuantityOnHand == 0` (หมดสต็อก)
- Top 3 สินค้ามูลค่าคงคลังสูงสุด (`QuantityOnHand * UnitPrice`)

### ส่วนที่ 4 — Host + Pipeline

ใน `Program.cs`:

1. ลงทะเบียน `IClock`, `IProductRepository`, `IInventoryService`, `ExceptionPipeline`
2. Seed สินค้าอย่างน้อย 4 รายการ คนละหมวดอย่างน้อย 2 หมวด
3. รันลำดับ:

- Receive สำเร็จ
- Issue สำเร็จ
- Issue ที่เกินสต็อก (ต้องถูก pipeline จับ → 409)
- Get by SKU ที่ไม่มี (→ 404)
- พิมพ์รายงานตามหมวด + รายการหมดสต็อก

---

## เกณฑ์ผ่าน

- [ ] ใช้ `record` สำหรับ Product / StockMovement / CategoryStock
- [ ] Services ใช้ primary constructor + DI (ไม่มี `new InMemoryProductRepository()` ใน business flow หลัก)
- [ ] LINQ `GroupBy` ทำงานถูกต้อง
- [ ] Exception pipeline map `NotFoundException` → 404 และ `InsufficientStockException` → 409
- [ ] อธิบายได้ว่า Deferred Execution คืออะไร และทำไม `ToList()` ถึงสำคัญเมื่อต้องการ snapshot

---

## คำใบ้

```csharp
public async Task<Product> IssueAsync(string sku, int qty, string reason, CancellationToken ct = default)
{
 if (qty <= 0) throw new ArgumentOutOfRangeException(nameof(qty));

 var product = await repo.GetBySkuAsync(sku, ct)
  ?? throw new NotFoundException($"SKU '{sku}' not found.");

 if (product.QuantityOnHand < qty)
  throw new InsufficientStockException($"SKU '{sku}' has only {product.QuantityOnHand} left.");

 var updated = product with { QuantityOnHand = product.QuantityOnHand - qty };
 await repo.UpdateAsync(updated, ct);
 return updated;
}
```

เฉลยเต็มอยู่ที่ [`lab/solution/`](./lab/solution/)

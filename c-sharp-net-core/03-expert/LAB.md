# Lab ระดับ Expert — Orders Desk (Clean Architecture + RBAC + Export)

## เป้าหมาย

สร้างระบบ **Orders Desk API** ระดับองค์กรที่มี:

- Clean Architecture 4 project: Domain / Application / Infrastructure / Api
- Policy-based Authorization (`Orders.Read`, `Orders.Write`, `Orders.Export`)
- EF Core query ที่ใช้ `AsNoTracking` + `Select` (ไม่มี N+1)
- Serilog audit logs
- `BackgroundService` + ClosedXML สำหรับ export ออเดอร์
- `Task.WhenAll` อย่างปลอดภัย (DbContext แยก scope)

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## โจทย์

### ส่วนที่ 1 — Domain

Entities:

1. **`Customer`** — `Id`, `Name`, `Email`
2. **`Order`** — `Id`, `CustomerId`, `CreatedAt`, `Status` (`Pending`/`Paid`/`Cancelled`)
3. **`OrderLine`** — `Id`, `OrderId`, `Sku`, `Quantity`, `UnitPrice`

Domain methods อย่างน้อย:

- `Order.Create(customerId, lines)`
- `Order.MarkPaid()`
- คำนวณ `Total` จาก lines

### ส่วนที่ 2 — Application Ports & Use Cases

Interfaces:

```csharp
IOrderRepository
IOrderQueryService // read models / DTO projections
IExportQueue
IExportStore
```

Use cases:

- List orders (DTO พร้อม `CustomerName`, `Total`, `LineCount`) — **ต้องเป็น Select projection**
- Create order (Admin/Manager)
- Enqueue export job
- Dashboard summary: นับ customers + orders แบบ `Task.WhenAll` + scope แยก

### ส่วนที่ 3 — Infrastructure

- `OrdersDbContext` + SQLite
- Repository / QueryService implementations
- `ExcelOrderExporter` ด้วย ClosedXML
- `ExportBackgroundService`
- Serilog file sink `logs/audit-.log`

### ส่วนที่ 4 — Api + Security

JWT users:

| Email                 | Password    | Role    | Extra claims               |
| --------------------- | ----------- | ------- | -------------------------- |
| `admin@example.com`   | `Passw0rd!` | Admin   | —                          |
| `manager@example.com` | `Passw0rd!` | Manager | `permission=orders:export` |
| `viewer@example.com`  | `Passw0rd!` | Viewer  | —                          |

Policies:

- `Orders.Read` → authenticated
- `Orders.Write` → Admin, Manager
- `Orders.Export` → Admin **หรือ** claim `orders:export`

Endpoints:

| Method | Path                            | Policy        |
| ------ | ------------------------------- | ------------- |
| `POST` | `/api/auth/login`               | Public        |
| `GET`  | `/api/orders`                   | Orders.Read   |
| `POST` | `/api/orders`                   | Orders.Write  |
| `GET`  | `/api/dashboard/summary`        | Orders.Read   |
| `POST` | `/api/exports/orders`           | Orders.Export |
| `GET`  | `/api/exports/{jobId}`          | Orders.Export |
| `GET`  | `/api/exports/{jobId}/download` | Orders.Export |

Seed อย่างน้อย 2 customers, 3 orders

---

## เกณฑ์ผ่าน

- [ ] Domain project **ไม่มี** package reference ไป EF/ASP.NET/ClosedXML
- [ ] `GET /api/orders` ใช้ projection (ตรวจจากโค้ด QueryService — ไม่ Include แล้ว map ใน memory เป็นหลัก)
- [ ] Viewer เรียก export → `403`
- [ ] Manager เรียก export → `202` แล้ว download ได้เมื่อ Completed
- [ ] มี audit log `OrderExportQueued` / `OrderExported`
- [ ] อธิบายได้ว่าทำไมห้าม `Task.WhenAll` บน DbContext เดียวกัน

---

## คำใบ้

```csharp
public async Task<IReadOnlyList<OrderListItem>> ListAsync(CancellationToken ct)
{
 // SQLite: Sum(decimal) ไม่ได้ — cast เป็น double ก่อน แล้วค่อยแปลงกลับ
 var rows = await db.Orders.AsNoTracking()
 .Select(o => new
 {
  o.Id,
  CustomerName = o.Customer.Name,
  o.Status,
  Total = o.Lines.Sum(l => (double)l.Quantity * (double)l.UnitPrice),
  LineCount = o.Lines.Count
 })
 .OrderByDescending(x => x.Total)
 .ToListAsync(ct);

 return rows
 .Select(x => new OrderListItem(
  x.Id, x.CustomerName, x.Status.ToString(), (decimal)x.Total, x.LineCount))
 .ToList();
}
```

เฉลยเต็มอยู่ที่ [`lab/solution/`](./lab/solution/)

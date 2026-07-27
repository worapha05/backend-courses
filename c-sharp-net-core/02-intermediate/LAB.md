# Lab ระดับ Intermediate — Catalog API (EF Core + Validation + JWT)

## เป้าหมาย

สร้าง ASP.NET Core Web API สำหรับแคตตาล็อกสินค้าที่มี:

- Controllers + `[ApiController]`
- EF Core (SQLite หรือ PostgreSQL) + Code-First model configuration
- FluentValidation
- CORS สำหรับ frontend dev origins
- JWT login + `[Authorize]` / role `Admin`

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## โจทย์

### ส่วนที่ 1 — Domain & DbContext

โมเดล **`Product`**:

| Field       | ชนิด             | เงื่อนไข                     |
| ----------- | ---------------- | ---------------------------- |
| `Id`        | `Guid`           | PK                           |
| `Sku`       | `string`         | required, max 64, **unique** |
| `Name`      | `string`         | required, max 200            |
| `Category`  | `string`         | required, max 100            |
| `Price`     | `decimal(18,2)`  | > 0                          |
| `IsActive`  | `bool`           | default true                 |
| `CreatedAt` | `DateTimeOffset` | utc now                      |

สร้าง `AppDbContext` + `OnModelCreating` ตามด้านบน

### ส่วนที่ 2 — API Endpoints

| Method   | Path                 | Auth    | พฤติกรรม                                                               |
| -------- | -------------------- | ------- | ---------------------------------------------------------------------- |
| `POST`   | `/api/auth/login`    | Public  | ออก JWT                                                                |
| `GET`    | `/api/products`      | Public  | ค้นหา `search`, `category`, `page`, `pageSize` — เฉพาะ `IsActive=true` |
| `GET`    | `/api/products/{id}` | Public  | รายละเอียด                                                             |
| `POST`   | `/api/products`      | `Admin` | สร้างสินค้า                                                            |
| `PUT`    | `/api/products/{id}` | `Admin` | แก้ไข                                                                  |
| `DELETE` | `/api/products/{id}` | `Admin` | soft-delete (`IsActive=false`)                                         |

### ส่วนที่ 3 — Validation

`CreateProductRequest` / `UpdateProductRequest`:

- Sku, Name, Category ไม่ว่างตามความยาว
- Price > 0
- ใช้ FluentValidation auto-validation

### ส่วนที่ 4 — Auth & CORS

- Users ในหน่วยความจำอย่างน้อย:
- `admin@example.com` / `Passw0rd!` → Role `Admin`
- `viewer@example.com` / `Passw0rd!` → Role `Viewer`
- JWT validate Issuer, Audience, Lifetime, SigningKey
- CORS policy อนุญาต `http://localhost:3000` และ `http://localhost:5173`
- Middleware ลำดับ: Swagger → CORS → Authentication → Authorization → Controllers

### ส่วนที่ 5 — Persistence Challenge

เขียน query ใน service:

```csharp
// สินค้าที่ชื่อหรือ SKU ตรง search (case-insensitive ตามที่ provider รองรับ)
// skip/take pagination
// AsNoTracking สำหรับ read
```

Seed อย่างน้อย 5 สินค้าเมื่อ DB ว่าง

---

## เกณฑ์ผ่าน

- [ ] `POST /api/products` โดยไม่มี token → `401`
- [ ] Login เป็น Viewer แล้ว POST → `403`
- [ ] Login เป็น Admin แล้ว POST ผ่าน validation → `201`
- [ ] Soft-delete แล้วไม่โผล่ใน `GET /api/products`
- [ ] อธิบายได้ว่าทำไม `DbContext` ต้อง Scoped และ `UseAuthentication` ต้องมาก่อน `UseAuthorization`

---

## คำใบ้

```csharp
[Authorize(Roles = "Admin")]
[HttpPost]
public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request, CancellationToken ct)
{
 var created = await _products.CreateAsync(request, ct);
 return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
}
```

เฉลยเต็มอยู่ที่ [`lab/solution/`](./lab/solution/)

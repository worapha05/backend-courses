# C# & .NET Core Bootcamp — Zero to Expert

bootcamp เรียนรู้ **C# และ ASP.NET Core Web API** แบบครบวงจรสำหรับ Modern Full-stack Developer ที่มุ่งสู่
**Modern C# · Web API · Enterprise Clean Architecture**
จาก C# 12 / LINQ / DI → Controllers / EF Core / JWT → RBAC / N+1 / Serilog / Excel Export / Onion

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- ใช้ **Modern C# (C# 12+)** ได้คล่อง: Primary Constructors, Records, Pattern Matching
- เขียน **LINQ** อย่างถูกต้อง ทั้ง Method/Query syntax, Deferred Execution และการแปลงข้อมูล
- ออกแบบ OOP ด้วย Interfaces, Abstract Classes, **Dependency Injection** และ Exception Handling
- สร้าง **ASP.NET Core Web API** ทั้ง Controllers และ Minimal APIs พร้อม Routing / Model Binding
- ใช้ **EF Core** (Code-First, Migrations, PostgreSQL/SQL Server) และ **FluentValidation + JWT**
- ออกแบบ **RBAC / Policy-based Authorization**, แก้ N+1, ใช้ Serilog, BackgroundWorker และ Excel Export
- จัดโครงสร้างโซลูชันแบบ **Clean Architecture / Onion** (Domain · Application · Infrastructure · Web API)

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                                                          | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------- | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | Modern C#, LINQ, OOP & DI Basics                                    | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | Web API, EF Core, CORS, FluentValidation, JWT                       | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | RBAC, EF Optimization, Serilog, Background Jobs, Clean Architecture | 2–4 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย เน้น architectural design และ Best Practices
2. **`examples/`** — โค้ด C# / ASP.NET Core ระดับ production-ready ที่รันได้จริง
3. **`LAB.md`** — โจทย์ปฏิบัติระบบจริงพร้อมเฉลยเต็มใน `lab/solution/`

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐานโปรแกรมมิ่ง (variables, loops, functions, OOP เบื้องต้น)
- ความเข้าใจ HTTP (methods, status codes, JSON) พื้นฐาน
- ติดตั้ง [.NET 8 SDK+](https://dotnet.microsoft.com/download) (แนะนำ .NET 8 หรือ 9)
- (ระดับ Intermediate+) Docker สำหรับ PostgreSQL (หรือใช้ SQL Server / SQLite ตามตัวอย่าง)

```bash
dotnet --version # ควรเป็น 8.0.x ขึ้นไป
```

```bash
# PostgreSQL สำหรับ Intermediate / Expert (ทางเลือก)
docker run --name netcore-bootcamp-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=bootcamp \
  -p 5432:5432 -d postgres:16
```

---

## วิธีใช้ Bootcamp

1. อ่าน `README.md` ของระดับนั้นให้จบก่อน — โฟกัสที่ **ทำไม .NET ออกแบบแบบนี้**
2. เปิด `examples/` แล้วรันทีละ project (`dotnet run`)
3. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลย
4. ไประดับถัดไปเมื่ออธิบาย design choice ของตนเองได้

```bash
# Beginner — Modern C#
cd csharp-netcore-bootcamp/01-beginner/examples/01-modern-csharp
dotnet run

# Intermediate — Web API Controllers vs Minimal
cd csharp-netcore-bootcamp/02-intermediate/examples/01-web-api-controllers-minimal
dotnet run

# Expert — Clean Architecture
cd csharp-netcore-bootcamp/03-expert/examples/04-clean-architecture
dotnet run --project src/Catalog.Api
```

---

## Learning Path ที่แนะนำ

```
Beginner: Modern C# + LINQ + OOP/DI/Exceptions
 ↓
Intermediate: Web API + EF Core + CORS/Validation/JWT
 ↓
Expert: RBAC + EF Optimization + Serilog/Background/Excel + Clean Architecture
 ↓
project จริงของคุณเอง (ASP.NET Core Portfolio API)
```

---

## หลักการสำคัญที่หลักสูตรย้ำตลอด

| หลักการ                     | ความหมายใน C# / ASP.NET Core                                                 |
| --------------------------- | ---------------------------------------------------------------------------- |
| Prefer composition + DI     | ลงทะเบียน abstraction ใน DI container — ไม่ `new` service ใน Controller      |
| LINQ is deferred            | Query ยังไม่รันจนกว่าจะ enumerate — ระวัง multiple enumeration               |
| Thin controllers            | Controller รับ HTTP แล้วส่งต่อ Application/Service layer                     |
| DbContext เป็น Unit of Work | Scoped lifetime ต่อ request — ไม่ใช้เป็น Singleton                           |
| Auth ≠ Authorization        | JWT บอกว่า “ใคร” — Policy/Roles บอกว่า “ทำอะไรได้”                           |
| I/O หนักอยู่นอก request     | `IHostedService` / BackgroundWorker สำหรับ export, email, ingestion          |
| Depend inward               | Domain ไม่รู้จัก Infrastructure — Clean Architecture บังคับทิศทาง dependency |

---

## Tech Stack มาตรฐานของหลักสูตร

| ชั้น       | เทคโนโลยี                                                                                |
| ---------- | ---------------------------------------------------------------------------------------- |
| Language   | C# 12+ (.NET 8+)                                                                         |
| Web        | ASP.NET Core Web API (Controllers + Minimal APIs)                                        |
| ORM        | Entity Framework Core 8                                                                  |
| Validation | FluentValidation                                                                         |
| Auth       | JWT Bearer (Microsoft.AspNetCore.Authentication.JwtBearer)                               |
| Logging    | Serilog                                                                                  |
| Export     | ClosedXML                                                                                |
| DB (เรียน) | SQLite (Beginner–Intermediate เริ่มต้น), PostgreSQL/SQL Server แนะนำสำหรับ Intermediate+ |

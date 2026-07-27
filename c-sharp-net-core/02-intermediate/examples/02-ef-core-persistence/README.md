# Example 02 — EF Core Persistence

```bash
dotnet run
# สร้าง DB อัตโนมัติด้วย EnsureCreated (demo) หรือใช้:
# dotnet ef migrations add InitialCreate
# dotnet ef database update
```

- SQLite file: `catalog.db`
- Endpoints: `/api/products`
- สลับ PostgreSQL/SQL Server ได้ใน `Program.cs` (ดูคอมเมนต์)

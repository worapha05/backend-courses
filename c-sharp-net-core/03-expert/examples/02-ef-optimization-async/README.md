# Example 02 — EF Core Optimization & Async

```bash
dotnet run
```

Endpoints เปรียบเทียบ:

- `GET /api/demo/n-plus-one` — แบบช้า (จำลอง)
- `GET /api/demo/include` — Include
- `GET /api/demo/select` — Select projection (แนะนำ)
- `GET /api/demo/parallel-safe` — Task.WhenAll ด้วย scope แยก

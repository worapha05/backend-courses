# Example 01 — RBAC & Policy Authorization

```bash
dotnet run
```

Login users (password `Passw0rd!`):

- `admin@example.com` → Admin
- `manager@example.com` → Manager + claim `permission=orders:export`
- `viewer@example.com` → Viewer

ลองเรียก `/api/orders/export` ด้วยแต่ละ role

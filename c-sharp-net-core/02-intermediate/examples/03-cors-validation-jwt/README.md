# Example 03 — CORS, FluentValidation, JWT

```bash
dotnet run
```

ทดสอบ:

```bash
# Login
curl -s -X POST http://localhost:5xxx/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Passw0rd!"}'

# ใช้ token
curl -s http://localhost:5xxx/api/secure/me -H "Authorization: Bearer <token>"
```

Users demo: `admin@example.com` / `user@example.com` รหัสผ่าน `Passw0rd!`

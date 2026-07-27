# Expert Lab — Secure Product Catalog API

## โจทย์

สร้าง Product Catalog API ที่มี:

1. **RBAC** — Guard + Custom Decorator สำหรับแยกบทบาท `admin`, `editor`, `viewer`
2. **Security** — Helmet, Rate Limiting, CORS, Graceful Shutdown
3. **Testing** — Unit Test ทุก Service + E2E Test ครอบคลุม Auth Flow

## เงื่อนไข

- `admin` → CRUD ทุกอย่าง
- `editor` → create + update (ห้าม delete)
- `viewer` → read only
- ใช้ `@SetMetadata` + `Reflector` ในการกำหนด roles
- ใช้ `@nestjs/throttler` สำหรับ rate limiting
- Graceful shutdown ต้อง drain requests ก่อนปิด
- E2E ใช้ `supertest` + mocked auth

## เฉลย

ดูได้ที่ `lab/solution/`

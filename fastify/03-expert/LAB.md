# Lab 3 — Enterprise Catalog Platform (Hexagonal + Hardening + Tuning)

## สถานการณ์จำลอง

บริษัทของคุณกำลังเปิดตัว **Catalog Platform** รองรับ flash sale:

- p99 latency ต้องต่ำ → schema serialization + Ajv tuning
- ทีมใหญ่ทำงานคนละ bounded context → nested plugin encapsulation
- Security review บังคับมี rate limit, CORS, centralized errors
- SRE ต้องการ `/health/live` และ `/health/ready` สำหรับ rolling deploy แบบ zero-downtime
- เคยมี memory leak จาก cache ที่เก็บ request object ทั้งก้อน — ต้องออกแบบกันไว้

---

## โจทย์

สร้างบริการเดียวที่ประกอบด้วย:

### A) Hexagonal Module: Catalog

Ports/Adapters:

- `CatalogRepository` port
- in-memory adapter (async)
- `CatalogService` domain/application
- HTTP adapter เป็น encapsulated plugin ที่ `prefix: '/api/catalog'`

API:

| Method | Path                               | รายละเอียด                    |
| ------ | ---------------------------------- | ----------------------------- |
| `GET`  | `/api/catalog/items`               | list + response schema        |
| `GET`  | `/api/catalog/items/:sku`          | get one                       |
| `POST` | `/api/catalog/items`               | create (admin)                |
| `POST` | `/api/catalog/items/:sku/purchase` | ลด stock แบบ atomic ใน memory |

### B) Production Hardening (root)

- `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`
- `setErrorHandler` กลาง — ไม่เปิด stack ใน response
- `/health/live` และ `/health/ready` พร้อม draining flag
- graceful SIGTERM: set draining → ready=503 → `app.close()`

### C) Performance Constraints

- Ajv: `removeAdditional: 'all'`, `allErrors: false`
- `LogController({ disableRequestLogging: true })` + log เฉพาะ business events
- ห้าม sync CPU หนักใน handler
- cache (ถ้ามี) ต้องเป็น LRU จำกัดขนาด **และห้ามเก็บ Fastify request object**

### D) Authz แบบ Encapsulation

- `POST /api/catalog/items` ต้องมี header `x-admin-key: expert-admin`
- `purchase` ใช้ `x-api-key: expert-client`
- health endpoints สาธารณะ

---

## เกณฑ์การตรวจ

- [ ] Domain service ทดสอบได้โดยไม่ต้องพึ่ง Fastify (แยกไฟล์)
- [ ] Response schema ตัด field ภายใน (เช่น `warehouseCode`) ออก
- [ ] ready กลายเป็น 503 ตอน draining
- [ ] validation error ผ่าน error handler กลาง
- [ ] rate limit ทำงาน (ทดสอบยิงถี่ ๆ ได้ 429)
- [ ] อธิบายได้ว่า encapsulation แยก admin/client hooks อย่างไร

---

## วิธีรันเฉลย

```bash
npm run expert:lab

curl http://127.0.0.1:3030/health/ready

curl -H 'x-api-key: expert-client' \
  http://127.0.0.1:3030/api/catalog/items

curl -X POST http://127.0.0.1:3030/api/catalog/items \
  -H 'content-type: application/json' \
  -H 'x-admin-key: expert-admin' \
  -d '{"sku":"SKU-9","name":"Ring Light","stock":30}'

curl -X POST http://127.0.0.1:3030/api/catalog/items/SKU-9/purchase \
  -H 'content-type: application/json' \
  -H 'x-api-key: expert-client' \
  -d '{"qty":2}'
```

---

## เฉลยโค้ดแบบเต็ม

ดูใน [`lab/solution/`](./lab/solution/)

```
lab/solution/
 server.ts
 domain/catalog-service.ts
 ports/catalog-repository.ts
 adapters/memory-catalog-repo.ts
 plugins/infra.ts
 plugins/hardening.ts
 modules/catalog-routes.ts
 schemas/catalog.ts
```

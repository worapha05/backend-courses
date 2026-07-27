# Lab 2 — High-Speed Order API (Schema + Hooks + DB Plugin)

## สถานการณ์จำลอง

platform E-commerce ของคุณเจอคอขวดตอน checkout:

- Client ส่ง field แปลก ๆ ใน body ทำให้ handler ต้อง validate เองทุกครั้ง → CPU สูง
- Response เผลอส่ง `costPrice` ออกไปภายนอก
- มี middleware กระจายทั่ว Express stack จนยากต่อการไล่ latency
- เมื่อ deploy ใหม่ connection DB ไม่ถูกปิด → connection leak

คุณได้รับมอบหมายให้สร้าง **Order Service บน Fastify** ที่แก้ปัญหาเหล่านี้ด้วย Schema, Hooks และ Plugin

---

## โจทย์

### Functional API

| Method  | Path                     | คำอธิบาย                         |
| ------- | ------------------------ | -------------------------------- |
| `GET`   | `/health`                | status + dbOpen                  |
| `GET`   | `/api/orders`            | list (query: `limit`, `status?`) |
| `GET`   | `/api/orders/:id`        | get one                          |
| `POST`  | `/api/orders`            | create (201)                     |
| `PATCH` | `/api/orders/:id/status` | update สถานะ                     |

### Order Model (ภายในระบบ)

```ts
type Order = {
  id: string;
  sku: string;
  qty: number;
  status: 'pending' | 'paid' | 'cancelled';
  costPrice: number; // ภายในเท่านั้น — ห้ามส่งออก client
  createdAt: string;
};
```

### Requirements บังคับ

1. **JSON Schema** สำหรับ:

- `POST` body: `sku`, `qty` (1–100), `additionalProperties: false`
- `GET` list query: `limit` (1–50), `status` enum optional
- `PATCH` body: `status` enum
- **response schemas** ที่ไม่มี `costPrice`

2. **`dbPlugin` (fp)** จำลอง async repository + `onClose`
3. **`onRequest` hook** ที่ใส่ `x-request-id` response header (สร้างถ้า client ไม่ส่งมา)
4. **Encapsulated `preHandler`** ใน orders plugin ที่ reject ถ้า header `x-api-key` ≠ `bootcamp-key` (ยกเว้น `/health`)
5. **Pino structured log** ตอน create/update
6. **Graceful shutdown** บน SIGINT/SIGTERM

### สถานการณ์คอขวดที่ต้อง “แก้ในออกแบบ”

อธิบายในคอมเมนต์หรือ README สั้น ๆ ในโค้ดว่า:

- การย้าย validation ไป Ajv ช่วยลดงานใน handler อย่างไร
- response schema กันข้อมูลรั่วและเร่ง serialization อย่างไร
- encapsulation ของ auth hook ป้องกัน overhead ใน `/health` อย่างไร

---

## เกณฑ์การตรวจ

- [ ] Request ที่ body ผิด schema ได้ 400 จาก Fastify/Ajv โดย handler ไม่รัน
- [ ] Response ไม่มี `costPrice`
- [ ] `/health` ไม่ต้องใช้ API key แต่ `/api/orders` ต้องใช้
- [ ] `app.close()` ปิด pool ได้
- [ ] มี request id ใน log/header

---

## วิธีรันเฉลย

```bash
npm run intermediate:lab

curl http://127.0.0.1:3020/health

curl -H 'x-api-key: bootcamp-key' \
  'http://127.0.0.1:3020/api/orders?limit=5'

curl -X POST http://127.0.0.1:3020/api/orders \
  -H 'content-type: application/json' \
  -H 'x-api-key: bootcamp-key' \
  -d '{"sku":"SKU-42","qty":3}'
```

---

## เฉลยโค้ดแบบเต็ม

ดูใน [`lab/solution/`](./lab/solution/)

```
lab/solution/
 server.ts
 plugins/db.ts
 plugins/request-id.ts
 routes/orders.ts
 schemas/order.ts
```

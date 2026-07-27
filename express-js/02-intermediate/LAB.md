# Lab 2 — Secure Catalog API (ShopForge)

## สถานการณ์

บริษัท ShopForge ต้องการ MVP สำหรับ **catalog สินค้า** ที่:

- ผู้ใช้สมัคร/ล็อกอินได้
- เฉพาะผู้ล็อกอินเท่านั้นที่สร้าง/แก้/ลบสินค้าได้
- ทุกคนดูรายการสินค้าได้ (public read)
- ต้องมี validation กัน payload มั่ว และ layered architecture

คุณได้รับโจทย์ให้สร้าง API ภายใน 1 sprint

---

## โจทย์

### Auth

| Method | Path                 | Auth   | รายละเอียด                                       |
| ------ | -------------------- | ------ | ------------------------------------------------ |
| `POST` | `/api/auth/register` | public | `{ email, password, name }` → user + accessToken |
| `POST` | `/api/auth/login`    | public | `{ email, password }` → user + accessToken       |
| `GET`  | `/api/auth/me`       | Bearer | โปรไฟล์ผู้ใช้ปัจจุบัน                            |

กฎ:

- password อย่างน้อย 8 ตัวอักษ — hash ด้วย bcrypt
- email unique — ซ้ำได้ `409`
- credentials ผิดได้ `401` (ข้อความเดียวกันทั้ง email ไม่มีและ password ผิด)
- JWT expiry สั้น (เช่น 15m) พร้อม `issuer` / `audience`

### Products

| Method   | Path                | Auth   | รายละเอียด                      |
| -------- | ------------------- | ------ | ------------------------------- |
| `GET`    | `/api/products`     | public | รายการสินค้า                    |
| `GET`    | `/api/products/:id` | public | รายละเอียด                      |
| `POST`   | `/api/products`     | Bearer | สร้าง — ผูก `ownerId` จาก token |
| `PATCH`  | `/api/products/:id` | Bearer | แก้ได้เฉพาะเจ้าของ              |
| `DELETE` | `/api/products/:id` | Bearer | ลบได้เฉพาะเจ้าของ               |

Schema สินค้า (Zod):

```ts
{
  sku: string; // A-Z0-9- ความยาว 3–32
  name: string; // 1–120
  price: number; // integer >= 0
}
```

### โครงสร้างบังคับ

```
src/
 controllers/
 services/
 repositories/ # in-memory ได้ (Map) — หรือ Prisma ถ้าพร้อม
 routes/
 middleware/
 validators/
 app.js
 server.js
```

เพิ่ม:

- Helmet + CORS allowlist
- error handler กลาง
- อย่าส่ง `passwordHash` ออกนอก service

---

## Acceptance Criteria

- [ ] Register แล้ว login ได้ และ `/me` ใช้ token เดียวกันได้
- [ ] `POST /api/products` โดยไม่มี token ได้ `401`
- [ ] User A สร้างสินค้าแล้ว User B แก้ไม่ได้ (`403`)
- [ ] body มี field แปลก (เช่น `role: "admin"`) แล้ว Zod `.strict()` ปฏิเสธ `400`
- [ ] Controller ไม่เรียก repository โดยตรง

---

## วิธีทดสอบ

```bash
JWT_SECRET=lab-secret npm run intermediate:lab

# register
curl -s -X POST localhost:3030/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@shop.dev","password":"password1","name":"Alice"}'

# login + create product (ใส่ token จาก response)
curl -s -X POST localhost:3030/api/products \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"sku":"CAM-01","name":"Webcam","price":1990}'
```

---

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

จุดเรียนรู้หลักจากเฉลย:

1. `requireAuth` ใส่ `req.user` — service ตรวจ ownership จาก `ownerId`
2. Repository ไม่รู้เรื่อง HTTP status
3. Validation middleware แทนที่ `req.body` ด้วยค่าที่ parse แล้วเท่านั้น

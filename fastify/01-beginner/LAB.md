# Lab 1 — Mini Product Catalog API (High-Throughput Ready Foundations)

## สถานการณ์จำลอง

ทีมของคุณกำลังย้าย API จาก Express ไป Fastify เพราะ latency p99 ของ endpoint `GET /products` พุ่งสูงตอน flash sale
PO ต้องการ **Mini Catalog Service** ที่:

1. แยก concerns ด้วย Plugin Encapsulation
2. ไม่บล็อก event loop
3. เตรียมโครงสร้างให้ต่อ schema validation ในเลเวลถัดไปได้ง่าย

---

## โจทย์

สร้าง Fastify server (TypeScript) ที่ทำงานดังนี้:

### Functional Requirements

| Method   | Path                   | พฤติกรรม              |
| -------- | ---------------------- | --------------------- |
| `GET`    | `/health`              | `{ status: "ok" }`    |
| `GET`    | `/api/v1/products`     | รายการสินค้าทั้งหมด   |
| `GET`    | `/api/v1/products/:id` | สินค้าตาม id หรือ 404 |
| `POST`   | `/api/v1/products`     | สร้างสินค้าใหม่ (201) |
| `DELETE` | `/api/v1/products/:id` | ลบสินค้า หรือ 404     |

โครงสร้างข้อมูลสินค้า:

```ts
type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  createdAt: string; // ISO
};
```

### Architecture Requirements

1. **`configPlugin`** (ใช้ `fastify-plugin`)

- decorate `appConfig: { serviceName, version }`

2. **`productStorePlugin`** (ใช้ `fastify-plugin`)

- decorate in-memory `Map` เป็น `productRepo`
- มี seed ข้อมูลเริ่มต้นอย่างน้อย 2 รายการ

3. **`productsRoutes`** (ไม่ใช้ `fp`)

- register ด้วย `prefix: '/api/v1'`
- ใช้ `productRepo` จาก parent

4. ใช้ `request.log` ตอนสร้าง/ลบสินค้า
5. Root ต้องมี route `/health` นอก encapsulation ของ products

### Performance / Design Constraints

- Handler ทุกตัวต้องเป็น `async` และ **ห้าม** ใช้ sync I/O
- ห้าม `JSON.stringify` เองใน handler
- `POST /products` ต้อง generate `id` เอง (เช่น `crypto.randomUUID()`)
- ถ้าราคา `price < 0` หรือ `stock < 0` ให้ตอบ `400` พร้อม `{ error: "INVALID_PRODUCT" }`
  (validation แบบ manual ในเลเวลนี้ — เลเวล 2 จะย้ายไป schema)

---

## เกณฑ์การตรวจ

- [ ] Encapsulation: routes เป็น plugin แยกไฟล์/function
- [ ] Shared store ใช้ `fp` จน routes มองเห็นได้
- [ ] 404 / 400 ถูกต้อง
- [ ] Logger ทำงานผ่าน Fastify/Pino
- [ ] อธิบายได้ว่าทำไม `productsRoutes` ไม่ควรหุ้มด้วย `fp`

---

## วิธีรันเฉลย

```bash
npm run beginner:lab
# curl http://127.0.0.1:3010/health
# curl http://127.0.0.1:3010/api/v1/products
```

---

## เฉลยโค้ดแบบเต็ม

ดูใน [`lab/solution/`](./lab/solution/) — สรุปโครงไฟล์:

```
lab/solution/
 server.ts  # boot + register plugins
 plugins/config.ts # fp config
 plugins/product-store.ts
 routes/products.ts # encapsulated routes
```

### จุดที่ต้องเข้าใจจากเฉลย

1. **`productStorePlugin` ใช้ `fp`** เพราะเป็น infrastructure ที่หลาย route ต้องใช้
2. **`productsRoutes` ไม่ใช้ `fp`** เพื่อจำกัด hooks/decorators ในอนาคตให้อยู่ใน domain products
3. การ validate แบบ manual ใน beginner เป็นจุดเริ่ม — intermediate จะแทนด้วย Ajv schema
4. การคืน object จาก handler เปิดทางให้ต่อ `response` schema + `fast-json-stringify` ได้ทันที

# Level 2 — Intermediate: Schema-Driven Development & Hooks Mechanics

> เป้าหมาย: ใช้ JSON Schema (Ajv) สำหรับ validation + serialization, คุม request lifecycle ด้วย hooks และเชื่อม DB/Logging ผ่าน plugins อย่างสะอาด

---

## 1. Schema Validation & Serialization

### 1.1 ทำไม Schema-Driven ถึงสำคัญต่อ Performance

ใน Express หลายทีม validate ด้วย Zod/Joi **ใน handler หรือ middleware** ทุก request:

- parse + validate แบบ interpretive ทุกครั้ง
- response ยังใช้ `JSON.stringify` ทั่วไป
- contract ของ API กระจายอยู่ในโค้ด ไม่ได้อยู่ใน schema เดียว

Fastify รวม **input validation (Ajv)** และ **output serialization (`fast-json-stringify`)** เข้ากับ route definition:

```ts
fastify.post(
  '/orders',
  {
    schema: {
      body: {/* Ajv */},
      response: {
        201: {/* fast-json-stringify */},
      },
    },
  },
  handler,
);
```

งาน compile เกิดตอน boot → request path เหลือแค่เรียก function ที่ compile แล้ว

### 1.2 Input Schemas: body / querystring / params / headers

| ส่วน          | ใช้เมื่อ            | ตัวอย่าง                       |
| ------------- | ------------------- | ------------------------------ |
| `body`        | POST/PUT/PATCH      | สร้างออเดอร์                   |
| `querystring` | pagination, filter  | `?limit=20&cursor=...`         |
| `params`      | path variables      | `/orders/:id`                  |
| `headers`     | auth/custom headers | `x-api-key`, `idempotency-key` |

ตัวอย่าง declarative schema:

```ts
const createOrderSchema = {
  body: {
    type: 'object',
    required: ['sku', 'qty'],
    additionalProperties: false,
    properties: {
      sku: { type: 'string', minLength: 1, maxLength: 64 },
      qty: { type: 'integer', minimum: 1, maximum: 999 },
      note: { type: 'string', maxLength: 200 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        sku: { type: 'string' },
        qty: { type: 'integer' },
        status: { type: 'string' },
      },
    },
  },
} as const;
```

### 1.3 Response Schemas = Serialization Contract

เมื่อมี `response[statusCode]`:

1. Fastify เลือก serializer ตาม status
2. `fast-json-stringify` เขียน JSON ตาม properties ที่ประกาศ
3. field ที่ไม่อยู่ใน schema **จะไม่ถูกส่งออก** (ช่วยกัน data leak เช่น password hash)

Best practice:

- ประกาศ response schema สำหรับ status หลัก (`200`, `201`)
- error response ใช้รูปแบบกลางผ่าน `setErrorHandler` (เลเวล Expert จะลึกกว่า)
- ใช้ `$id` / `$ref` เมื่อ schema ซ้ำหลาย route

### 1.4 Ajv กับการตั้งค่าที่พบบ่อย

Fastify ใช้ Ajv ภายใน คุณปรับผ่าน `ajv` option ของ instance:

```ts
const app = Fastify({
  ajv: {
    customOptions: {
      removeAdditional: 'all', // ตัด field เกินจาก body
      coerceTypes: 'array', // แปลง query string → number/boolean อย่างระวัง
      allErrors: false, // true = ช้ากว่าเล็กน้อย แต่ debug ง่าย
    },
  },
});
```

| Option                    | ข้อดี                | ข้อควรระวัง                  |
| ------------------------- | -------------------- | ---------------------------- |
| `removeAdditional: 'all'` | payload สะอาด        | ต้องประกาศ properties ให้ครบ |
| `coerceTypes: true`       | query/params ใช้ง่าย | อาจซ่อน bug type จาก client  |
| `allErrors: true`         | รายงาน error ครบ     | เพิ่มงาน validate            |

---

## 2. Lifecycle Hooks — Middleware แบบ Fastify

### 2.1 ลำดับ Hooks ทั้งเส้น

```
onRequest
 → preParsing
 → (Body parsing)
 → preValidation
 → (Ajv Validation)
 → preHandler
 → (Route Handler)
 → preSerialization
 → onSend
 → (Response sent)
 → onResponse
 → onTimeout / onError (ตามเหตุการณ์)
```

### 2.2 Hook แต่ละตัวใช้ทำอะไร

| Hook                             | จังหวะ                      | เคสการใช้งาน                            |
| -------------------------------- | --------------------------- | --------------------------------------- |
| `onRequest`                      | เร็วสุด ก่อน parse          | API key หยาบ ๆ, tracing, early reject   |
| `preParsing`                     | ก่อนอ่าน body               | จำกัด content-type, custom parser hints |
| `preValidation`                  | หลัง parse ก่อน Ajv         | normalize ข้อมูล, เติม default          |
| `preHandler`                     | หลัง validate ก่อน business | authz ที่ต้องใช้ body ที่ถูกต้องแล้ว    |
| `preSerialization`               | ก่อน serialize              | แปลง entity → DTO                       |
| `onSend`                         | ก่อนส่ง payload จริง        | ใส่ header, วัดขนาด response            |
| `onResponse`                     | หลังส่งเสร็จ                | metrics, slow-request log               |
| `onClose` / `addHook('onClose')` | ตอนปิดแอป                   | ปิด DB pool                             |

### 2.3 Global vs Route-specific vs Encapsulated Hooks

```ts
// Global (root) — กระทบทุก route
app.addHook('onRequest', async (request) => {
  request.log.debug('incoming');
});

// Route-specific
app.get(
  '/admin',
  {
    onRequest: [
      async (req, reply) => {
        /* auth */
      },
    ],
  },
  handler,
);

// Encapsulated — อยู่ใน plugin เท่านั้น
async function adminPlugin(fastify) {
  fastify.addHook('preHandler', adminGuard);
  fastify.get('/stats', handler);
}
```

> Hooks ที่ลงทะเบียนใน encapsulated plugin จะรันเฉพาะ request ที่เข้าสู่ context นั้น
> นี่คือเหตุผลที่ Fastify จัดการ "middleware sprawl" ได้ดีกว่า Express

### 2.4 Data Flow ที่ถูกต้องสำหรับ Auth

```
onRequest: อ่าน JWT จาก header (ยังไม่ต้องพึ่ง body)
preValidation: (optional) เติม request.user จาก token แบบเบา ๆ
preHandler: ตรวจ permission จาก body + user (ข้อมูลครบแล้ว)
handler: business logic อย่างเดียว
```

อย่าใส่ business rule หนัก ๆ ใน `onRequest` ถ้ายังต้องการ body ที่ validate แล้ว

---

## 3. Data Integration & Logging

### 3.1 เชื่อม Database ผ่าน Plugin (Clean Pattern)

แนวทางที่แนะนำ:

```ts
const dbPlugin = fp(
  async (fastify, opts) => {
    const pool = createPool(opts.connectionString); // pg / mongodb client

    fastify.decorate('db', pool);

    fastify.addHook('onClose', async () => {
      await pool.end();
    });
  },
  { name: 'db-plugin' },
);
```

หลักการ:

1. สร้าง connection **ครั้งเดียวตอน boot**
2. decorate ด้วย `fp` ให้ทุก feature มองเห็น
3. ปิด connection ใน `onClose` → graceful shutdown
4. อย่าสร้าง client ใหม่ทุก request

ในตัวอย่างเลเวลนี้ใช้ **in-memory repository ที่จำลอง async DB** เพื่อให้รันได้โดยไม่ต้องมี Docker
รูปแบบ plugin / `onClose` เหมือนของจริงทุกประการ

### 3.2 Graceful Shutdown

```ts
const close = async () => {
  await app.close(); // trigger onClose hooks
  process.exit(0);
};

process.on('SIGINT', close);
process.on('SIGTERM', close);
```

`app.close()` จะ:

- หยุดรับ connection ใหม่
- รอ in-flight requests (ตาม config)
- เรียก `onClose` hooks (ปิด DB, flush metrics)

### 3.3 Pino — Ultra-fast Structured Logging

Fastify ใช้ Pino เป็น default:

```ts
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    // production: ไม่ใช้ pino-pretty (pretty ช้า เหมาะกับ dev)
  },
});

request.log.info({ orderId }, 'order.created');
```

Best practices:

| ทำ                               | อย่าทำ                              |
| -------------------------------- | ----------------------------------- |
| ใช้ `request.log` (มี reqId)     | `console.log` ใน hot path           |
| log เป็น object `{ key: value }` | สร้าง string ยาว ๆ ก่อนแล้วค่อย log |
| ตั้ง level ตาม env               | log body ทั้งก้อนที่มี PII          |
| ใช้ `pino-pretty` เฉพาะ dev      | ใช้ pretty ใน production            |

---

## 4. Best Practices (Intermediate)

1. **ประกาศ schema คู่กับ route เสมอ** สำหรับ public API
2. ใช้ `additionalProperties: false` ใน body เมื่อต้องการ contract เข้ม
3. วาง auth เบา ๆ ใน `onRequest` / `preHandler` ตามข้อมูลที่ hook นั้นมี
4. จำกัดขอบเขต hooks ด้วย encapsulation ไม่ใส่ทุกอย่างที่ root
5. DB client ต้องอยู่ใน plugin + `onClose`
6. Production logger = Pino JSON stdout (ให้ collector ไปรวบ)
7. อย่าทำ CPU-heavy work ใน hook ร่วม — แยกไป worker/queue

---

## 5. ไฟล์ตัวอย่างในเลเวลนี้

| folder                           | สิ่งที่เรียนรู้                            |
| -------------------------------- | ------------------------------------------ |
| `examples/01-schema-validation/` | body/query/params + response serialization |
| `examples/02-lifecycle-hooks/`   | onRequest → onResponse แบบจับต้องได้       |
| `examples/03-db-logging/`        | db plugin, onClose, Pino structured logs   |
| `lab/solution/`                  | เฉลย Lab: Order API schema-driven          |

อ่านต่อ: [`LAB.md`](./LAB.md)

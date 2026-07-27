# Level 3 — Expert: Enterprise Scaling, High-Performance Tuning & Production Hardening

> เป้าหมาย: ออกแบบแอป enterprise ด้วย nested plugin boundaries (Hexagonal/Clean), ปรับแต่ง Ajv/HTTP/concurrency และ harden สำหรับ production

---

## 1. Advanced Plugin Architecture (Hexagonal / Clean)

### 1.1 ทำไม Encapsulation ของ Fastify เข้ากับ Hexagonal

Hexagonal Architecture แยก:

- **Domain** — business rules บริสุทธิ์
- **Ports** — interfaces (repositories, publishers)
- **Adapters** — HTTP routes, DB drivers, external APIs

Fastify encapsulation ให้ **boundary ตามธรรมชาติ**:

```
Root
├── infra/ (fp)  → config, db, logger, metrics [shared adapters]
├── modules/orders/ → encapsulated context
│ ├── routes (HTTP adapter)
│ ├── hooks (authz เฉพาะ module)
│ └── uses ports จาก infra
└── modules/inventory/ → คนละ context ไม่รั่ว hooks ข้าม module
```

ข้อได้เปรียบเทียบ Express monolothic middleware:

| Express                                  | Fastify nested plugins                |
| ---------------------------------------- | ------------------------------------- |
| middleware ลำดับเดียวทั้งแอป             | hooks จำกัดตาม context                |
| DI มักพึ่ง container ภายนอก              | decorate + fp เป็น composition root   |
| feature flag / module boundary คลุมเครือ | `register(module, { prefix })` ชัดเจน |

### 1.2 รูปแบบ Composition Root

```ts
const app = Fastify({ logger: true });

// Infrastructure — break encapsulation
await app.register(configPlugin);
await app.register(dbPlugin);
await app.register(securityPlugins); // helmet, cors, rate-limit (มักอยู่ใกล้ root)

// Application modules — keep encapsulated
await app.register(ordersModule, { prefix: '/api/orders' });
await app.register(inventoryModule, { prefix: '/api/inventory' });
```

ภายใน module:

```ts
export const ordersModule: FastifyPluginAsync = async (fastify) => {
  const service = createOrderService({ repo: fastify.db.orders });

  fastify.addHook('preHandler', requireScope('orders:write')); // เฉพาะ module นี้

  fastify.post('/', { schema: createOrderSchema }, async (req, reply) => {
    const result = await service.create(req.body);
    return reply.code(201).send(result);
  });
};
```

### 1.3 Data Flow แบบ Ports & Adapters

```
HTTP Request
 │
 ▼
[HTTP Adapter: Fastify route + schema]
 │
 ▼
[Application Service / Use Case]
 │
 ├──► Port: OrderRepository ──► Adapter: Postgres
 └──► Port: EventBus  ──► Adapter: Queue / in-memory
 │
 ▼
[Response DTO via response schema]
```

กฎ:

- Route handler **บาง** — ไม่มี SQL
- Domain ไม่ import `fastify`
- มีเพียง adapters ที่รู้จัก Fastify types

---

## 2. Ultra-High Performance Tuning

### 2.1 ปรับ Ajv ให้เหมาะกับ Traffic สูง

```ts
const app = Fastify({
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all',
      allErrors: false, // production: รวดเร็วกว่า
      useDefaults: true,
    },
  },
});
```

คำแนะนำ:

- หลีก `allErrors: true` ใน production ถ้าไม่จำเป็นต่อ UX
- ใช้ schema ร่วม (`$id` + `$ref`) เพื่อลด compile cost และความซ้ำ
- อย่าใส่ `format` ที่หนักโดยไม่จำเป็น (หรือใช้ ajv formats อย่างมีสติ)

### 2.2 กัน Memory Leak ภายใต้ Concurrent Load

สาเหตุยอดฮิตใน Fastify/Node services:

| สาเหตุ                                            | อาการ                  | วิธีกัน                                       |
| ------------------------------------------------- | ---------------------- | --------------------------------------------- |
| เก็บ request/response ไว้ใน closure ของ singleton | RSS โตเรื่อย ๆ         | อย่าเก็บ `request` ใน global Map โดยไม่มี TTL |
| unbounded in-memory cache                         | heap สูง               | LRU + max size                                |
| listener ซ้ำทุก request                           | `MaxListenersExceeded` | ลงทะเบียน listener ตอน boot                   |
| ไม่ปิด DB / timer ใน `onClose`                    | leak ตอน hot reload    | ใช้ `onClose` เสมอ                            |
| log object ใหญ่ทุก request                        | memory + CPU           | log id/metadata ไม่ใช่ทั้ง body               |

### 2.3 ป้องกัน Blocking บน Event Loop

Fastify เร็วแค่ไหนก็แพ้ **sync CPU work** ใน handler:

```ts
// แย่ — block event loop
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

// ดี — async crypto / worker
const hash = await pbkdf2(password, salt, 100000, 64, 'sha512');
```

แนวทาง:

- งาน CPU หนัก → `worker_threads` / queue
- ไฟล์ใหญ่ → streams ไม่ buffer ทั้งก้อน
- อย่าใช้ `fs.*Sync` ใน hot path

ตรวจด้วย: `under-pressure` / event-loop delay metrics

### 2.4 HTTP/2 ใน Fastify

```ts
import { readFileSync } from 'node:fs';
import Fastify from 'fastify';

const app = Fastify({
  http2: true,
  https: {
    key: readFileSync('certs/key.pem'),
    cert: readFileSync('certs/cert.pem'),
  },
  logger: true,
});
```

ประโยชน์ HTTP/2:

- multiplexing หลาย streams ใน connection เดียว
- header compression (HPACK)
- เหมาะกับ API ที่ client เปิดหลาย parallel requests

ข้อควรระวัง:

- ต้องมี TLS (browser)
- load balancer/proxy ต้องรองรับ (หรือ terminate TLS ที่ edge แล้วพูด HTTP/1.1 เข้าพอด)
- ในตัวอย่าง bootcampเราโชว์ config pattern — ไม่บังคับ cert จริง

### 2.5 Serialization & Routing Hot Path Checklist

1. มี `response` schema สำหรับ endpoint ที่ traffic สูง
2. อย่าเรียก `reply.serializer()` แบบ dynamic ทุก request โดยไม่จำเป็น
3. ใช้ `find-my-way` constraints (method/host) แทนการแตก branch ใน handler
4. ปิด request logging ละเอียดใน hot path ถ้าจำเป็น (`logController: new LogController({ disableRequestLogging: true })`) แล้ววัด metrics เอง

---

## 3. Production Security & Operations

### 3.1 Cookie / Session อย่างปลอดภัย

```ts
await app.register(cookie);
await app.register(session, {
  secret: process.env.SESSION_SECRET!, // ยาวและสุ่ม
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true, // กัน XSS อ่าน cookie
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  },
});
```

อย่าเก็บ session secret ในโค้ด และหมุนเวียน secret ได้เมื่อใช้ array ของ secrets

### 3.2 Rate Limiting & CORS & Helmet

```ts
await app.register(cors, { origin: ['https://app.example.com'], credentials: true });
await app.register(helmet);
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
```

Rate limit ระดับ global ป้องกัน abuse หยาบ ๆ
endpoint แพง (login, OTP) ควรจำกัดแยกและเข้มกว่า

### 3.3 Centralized Error Handling

```ts
app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'request.failed');

  if (error.validation) {
    return reply.code(400).send({
      error: 'VALIDATION_ERROR',
      details: error.validation,
    });
  }

  const status = error.statusCode ?? 500;
  return reply.code(status).send({
    error: status >= 500 ? 'INTERNAL_ERROR' : error.message,
  });
});
```

หลักการ:

- ไม่ส่ง stack trace ออก client ใน production
- map domain errors → HTTP status ที่สม่ำเสมอ
- log ด้วย `err` key เพื่อให้ Pino serialize error ถูกต้อง

### 3.4 Zero-Downtime Microservice Registration Pattern

แนวคิด (ใช้กับ service discovery / gateway):

```
boot:
 1. listen บน port (หรือ unix socket)
 2. readiness = false จนกว่า plugins (db) ready
 3. register ตัวเองกับ registry/gateway
 4. readiness = true

shutdown (SIGTERM):
 1. readiness = false (เลิกรับ traffic ใหม่จาก LB)
 2. deregister จาก registry
 3. รอ in-flight หมด
 4. app.close() → ปิด DB
```

ในโค้ด Fastify มักแยก:

- `/health/live` — process ยังอยู่
- `/health/ready` — พร้อมรับ traffic (db เปิด, ไม่ได้อยู่ใน draining)

---

## 4. Best Practices (Expert)

1. จัด module ตาม bounded context ไม่ใช่ตาม technical layer อย่างเดียว
2. `fp` เฉพาะ infra ที่ต้องแชร์ — feature modules คง encapsulation
3. วัดก่อน tune: latency histogram, event loop delay, heap
4. Schema คือ contract — generate docs/tests จาก schema ได้
5. Security headers + rate limit + error handler เป็น default ของทุกบริการ
6. Readiness/liveness แยกกันสำหรับ zero-downtime
7. ห้าม block event loop — Fastify ช่วยลด overhead แต่ไม่ช่วยงาน sync หนัก

---

## 5. ไฟล์ตัวอย่างในเลเวลนี้

| folder                              | สิ่งที่เรียนรู้                                 |
| ----------------------------------- | ----------------------------------------------- |
| `examples/01-hexagonal-plugins/`    | nested modules + ports/adapters                 |
| `examples/02-performance-tuning/`   | Ajv tuning, under-pressure, non-blocking        |
| `examples/03-production-hardening/` | CORS, rate limit, error handler, ready/live     |
| `lab/solution/`                     | เฉลย Lab: Enterprise Catalog แบบ production-ish |

อ่านต่อ: [`LAB.md`](./LAB.md)

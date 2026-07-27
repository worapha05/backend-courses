# Level 1 — Beginner: Low-Overhead Paradigms & Fastify Core

> เป้าหมาย: เข้าใจว่าทำไม Fastify เร็ว, ใช้ Routing/Lifecycle ได้คล่อง และออกแบบ Plugin ด้วย Encapsulation อย่างถูกต้อง

---

## 1. Express vs Fastify — ทำไม Fastify เร็วกว่า?

### 1.1 Overheads ที่ Express แบกไว้โดยปริยาย

Express ถูกออกแบบยุคแรกของ Node.js โดยยึดแนวคิด **middleware chain แบบยืดหยุ่นสูง**:

| จุด           | Express                               | ผลกระทบต่อ latency                           |
| ------------- | ------------------------------------- | -------------------------------------------- |
| Router        | Layer stack วนไล่ middleware ตามลำดับ | เพิ่มงานต่อ request เมื่อมี middleware มาก   |
| Body parsing  | มักพึ่ง middleware ภายนอก             | parse ทุก request แม้ไม่จำเป็น               |
| Validation    | ไม่มี built-in                        | ต้อง validate ใน handler หรือ middleware เอง |
| Serialization | `JSON.stringify` ทุกครั้ง             | ไม่ compile schema ล่วงหน้า                  |
| Logging       | ไม่มี structured logger ในตัว         | ต้องต่อเอง มักช้าถ้าใช้ `console`            |

Fastify ตั้งใจ **หลีกเลี่ยง overhead** (avoidance of overhead) ตั้งแต่แกน:

1. **Router: `find-my-way`** — radix tree / compact prefix tree สำหรับ path matching ที่เร็วและ deterministic
2. **Validation: Ajv** — compile JSON Schema ตอน boot ไม่ใช่ตอน request
3. **Serialization: `fast-json-stringify`** — สร้าง function stringify จาก response schema ตอน boot
4. **Logging: Pino** — structured logger ที่เขียนลง stream แบบ low-overhead
5. **Plugin encapsulation** — จำกัดขอบเขต decorator/hook ไม่ให้รั่วไปทั้งแอปโดยไม่ตั้งใจ

### 1.2 Radical Serialization ด้วย `fast-json-stringify`

เมื่อคุณประกาศ `schema.response`:

```ts
schema: {
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
}
```

Fastify จะ **compile** serializer เป็น function เฉพาะทางตอน `listen()` / `ready()`:

- ไม่ต้องเดิน object tree แบบ generic ทุกครั้ง
- ตัด property ที่ไม่อยู่ใน schema ออกได้ (ช่วยลด payload และข้อมูลรั่ว)
- เร็วกว่า `JSON.stringify` อย่างมีนัยสำคัญเมื่อ response shape คงที่

> **Insight:** ความเร็วของ Fastify ไม่ได้มาจาก "magic" แต่มาจากการ **ย้ายงานหนักไปที่ boot time** แล้วให้ request path ทำแค่งานที่จำเป็น

### 1.3 Data Flow เปรียบเทียบ

```
Express (typical):
 req → mw1 → mw2 → router match → handler → JSON.stringify → res

Fastify (schema-driven):
 req → find-my-way → hooks (scoped) → Ajv validate
 → handler → compiled serializer → res
 → Pino log (async-ish, non-blocking flush strategy)
```

---

## 2. Core Routing & Request Lifecycle

### 2.1 สร้าง Fastify Instance

```ts
import Fastify from 'fastify';

const app = Fastify({
  logger: true, // เปิด Pino
  // logger: { level: 'info' }
});
```

ตัวเลือกสำคัญในระดับ beginner:

| Option                         | ความหมาย                                    |
| ------------------------------ | ------------------------------------------- |
| `logger` / `logController`     | เปิด/ปรับ Pino และควบคุม request access log |
| `requestIdHeader` / `genReqId` | ผูก request id สำหรับ tracing               |
| `pluginTimeout`                | timeout ตอนโหลด plugin                      |

### 2.2 ประกาศ Route และ Shorthand Methods

```ts
// แบบเต็ม
app.route({
  method: 'GET',
  url: '/health',
  handler: async () => ({ status: 'ok' }),
});

// shorthand
app.get('/health', async () => ({ status: 'ok' }));
app.post('/items', async (request, reply) => {
  /* ... */
});
app.put('/items/:id', handler);
app.patch('/items/:id', handler);
app.delete('/items/:id', handler);
```

### 2.3 Request & Reply

**Request** — อ่านข้อมูลขาเข้า:

- `request.body` — ต้องมี content-type parser (JSON มีมาให้)
- `request.query` — querystring
- `request.params` — path params
- `request.headers` — headers
- `request.log` — child logger ของ request นั้น

**Reply** — ส่งผลลัพธ์:

- `return value` จาก async handler → Fastify ส่งเป็น JSON ให้เอง
- `reply.code(201).send(payload)`
- `reply.header('x-foo', 'bar')`
- `reply.redirect('/elsewhere')`

Best practice:

```ts
// ดี — ให้ Fastify จัดการ serialization
return { id: '1', name: 'Ada' };

// หลีกเลี่ยงใน hot path — ข้าม schema serializer
reply.send(JSON.stringify(obj)); // อย่าทำแบบนี้โดยไม่จำเป็น
```

### 2.4 Lifecycle ระดับพื้นฐาน (ยังไม่ลง hooks ลึก)

ลำดับโดยย่อของ request หนึ่งครั้ง:

```
incoming
 → routing (find-my-way)
 → onRequest hooks
 → preParsing → parsing body
 → preValidation → validation (Ajv)
 → preHandler
 → route handler
 → preSerialization / onSend
 → response serialization
 → onResponse
```

ในระดับ beginner ให้จำว่า: **handler ควรกินเวลาน้อย และไม่ block event loop**

---

## 3. Plugin System — "Everything is a Plugin"

### 3.1 กฎทองของ Ecosystem

ใน Fastify **ทุกอย่างคือ plugin**:

- routes ของ domain หนึ่ง → plugin
- การต่อ database → plugin
- auth / decoration → plugin
- การตั้งค่า shared utilities → plugin

Plugin คือ function:

```ts
async function productsPlugin(fastify, options) {
  fastify.get('/products', async () => []);
}
```

ลงทะเบียนด้วย:

```ts
await app.register(productsPlugin, { prefix: '/api/v1' });
```

### 3.2 Encapsulation คืออะไร?

เมื่อ `register()` plugin ลูก Fastify จะสร้าง **context ใหม่** (encapsulation context):

```
Root Context
├── decorators / hooks ของ root
├── Plugin A (context A) ← hooks/decorators ใน A อยู่แค่ใน A + ลูกของ A
│ └── Plugin A.1
└── Plugin B (context B) ← มองไม่เห็นของ A
```

ผลลัพธ์สำคัญ:

- `fastify.decorate('db', db)` ใน plugin A **จะไม่ปรากฏ** ใน plugin B
- hooks ที่ลงใน A จะรันเฉพาะ request ที่เข้า routes ของ A (และลูก)
- ช่วยกัน "มลพิษ" ของ middleware ทั้งแอปแบบ Express

### 3.3 Root-level vs Encapsulated Registration

| แบบ                             | เมื่อไหร่ใช้                                  | ผล                                   |
| ------------------------------- | --------------------------------------------- | ------------------------------------ |
| `app.register(plugin)`          | domain / feature แยกขอบเขต                    | encapsulation ตามปกติ                |
| `fp(plugin)` (`fastify-plugin`) | สิ่งที่ต้องแชร์ขึ้น parent (db, auth, config) | **ทะลุ encapsulation** ขึ้นไป parent |

```ts
import fp from 'fastify-plugin';

// Shared infrastructure — ต้อง break encapsulation
export default fp(
  async (fastify) => {
    fastify.decorate('config', { env: 'dev' });
  },
  { name: 'config-plugin' },
);
```

> **กฎง่าย ๆ:**
>
> - Feature routes → **อย่า** หุ้มด้วย `fp`
> - Shared infra (db, auth decorator, sensbile) → **ใช้** `fp`

### 3.4 Data Flow ของ Plugin Tree

```
boot:
 root.register(configPlugin) // fp → decorate บน root
 root.register(dbPlugin)  // fp → decorate db บน root
 root.register(usersRoutes, { prefix: '/users' }) // encapsulated
 root.register(ordersRoutes, { prefix: '/orders' }) // encapsulated

request GET /users/1:
 ใช้ hooks ของ root + usersRoutes เท่านั้น
 มองเห็น decorators ที่ fp ดันขึ้น root
 มองไม่เห็น decorators เฉพาะของ ordersRoutes
```

---

## 4. Best Practices (Beginner)

1. **แยกไฟล์ตาม domain** เป็น plugins ไม่กอง routes ไว้ไฟล์เดียว
2. **ใช้ `prefix` ใน `register`** แทนการ hardcode `/api/v1/...` ซ้ำในทุก route
3. **อย่า decorate ของแชร์โดยไม่ใช้ `fp`** — จะงงว่าทำไม `fastify.db` เป็น `undefined`
4. **คืนค่าจาก handler** ให้ Fastify serialize แทนการ `JSON.stringify` เอง
5. **เปิด logger** ตั้งแต่ต้น และใช้ `request.log` ไม่ใช่ `console.log`
6. **ตั้งชื่อ plugin** ด้วย `fp(..., { name: '...' })` เพื่อ debug encapsulation graph
7. **อย่าบล็อก event loop** ใน handler (เช่น `fs.readFileSync` ก้อนใหญ่บน hot path)

---

## 5. ไฟล์ตัวอย่างในเลเวลนี้

| folder                              | สิ่งที่เรียนรู้                               |
| ----------------------------------- | --------------------------------------------- |
| `examples/01-core-routing/`         | สร้าง server, shorthand routes, Request/Reply |
| `examples/02-plugin-encapsulation/` | Encapsulation vs `fastify-plugin`             |
| `lab/solution/`                     | เฉลย Lab: Mini Catalog API                    |

อ่านต่อ: [`LAB.md`](./LAB.md)

# Level 3 — Expert: Performance, Security Hardening & Scale

เป้าหมายระดับนี้: พา Express API จาก “ใช้งานได้” สู่ **พร้อมขึ้น production**
ด้วย async error excellence, Streams/uploads, hardening และ multi-core scaling

---

## สารบัญ

1. [Asynchronous Excellence & Global Error Handling](#1-asynchronous-excellence--global-error-handling)
2. [Uncaught Exceptions และ Unhandled Rejections](#2-uncaught-exceptions-และ-unhandled-rejections)
3. [Node.js Streams และ Memory Efficiency](#3-nodejs-streams-และ-memory-efficiency)
4. [Secure Multipart File Uploads](#4-secure-multipart-file-uploads)
5. [Production Security — Rate Limit, Injection, XSS](#5-production-security--rate-limit-injection-xss)
6. [Scalability — Cluster Module และ PM2](#6-scalability--cluster-module-และ-pm2)
7. [Connection Pooling และ Health Checks](#7-connection-pooling-และ-health-checks)
8. [Best Practices สรุป](#8-best-practices-สรุป)

---

## 1. Asynchronous Excellence & Global Error Handling

ใน Express 4 การ `throw` ใน `async` function **ไม่ถูกจับอัตโนมัติ** — ต้อง `next(err)` หรือห่อด้วย `asyncHandler`

แนวทางระดับ production:

```js
// 1) Domain errors ที่คาดการณ์ได้
export class AppError extends Error {
  constructor(status, message, { code, details, isOperational = true } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
  }
}

// 2) Global error middleware — แปลง error จากหลายแหล่งให้เป็น response shape เดียว
export function globalErrorHandler(err, req, res, _next) {
  const status = err.status ?? 500;
  const payload = {
    error: {
      message: err.isOperational ? err.message : 'Internal Server Error',
      code: err.code ?? 'INTERNAL_ERROR',
      requestId: req.requestId,
    },
  };
  if (err.details) payload.error.details = err.details;

  if (!err.isOperational || status >= 500) {
    console.error({ err, requestId: req.requestId });
  }
  res.status(status).json(payload);
}
```

หลักการ **operational vs programmer error**:

| ประเภท      | ตัวอย่าง                           | ตอบสนอง                                   |
| ----------- | ---------------------------------- | ----------------------------------------- |
| Operational | validation fail, 404, upstream 503 | ตอบ client ตามสถานะ, โปรเซสอยู่ต่อ        |
| Programmer  | `undefined is not a function`      | log เต็ม, อาจ restart โปรเซสอย่างมีแบบแผน |

ดูตัวอย่าง: [`examples/01-async-error-handling/`](./examples/01-async-error-handling/)

---

## 2. Uncaught Exceptions และ Unhandled Rejections

นอก Express ยังมี failure ที่หลุดจาก middleware:

```js
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection', reason);
  // ใน production: ส่งเมตริก + เริ่ม graceful shutdown
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
  // หลัง uncaughtException สถานะโปรเซสไม่น่าเชื่อถือ — ควร exit หลัง flush logs
  process.exit(1);
});
```

Graceful shutdown pattern:

```js
async function shutdown(signal) {
  console.log(`received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

> **กฎทอง:** อย่า `process.exit(0)` ทันทีเมื่อมี in-flight requests — ปิด server รับของใหม่ก่อน แล้วรอให้ของเก่าจบ

---

## 3. Node.js Streams และ Memory Efficiency

การ `fs.readFile` ทั้งไฟล์เข้า memory ใช้ได้กับไฟล์เล็ก แต่พังกับไฟล์ใหญ่

```js
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

// ดี: pipe ทีละ chunk
await pipeline(
  createReadStream('large.csv'),
  transformStream, // optional
  createWriteStream('out.csv'),
);
```

ใน Express สำหรับ download:

```js
app.get('/files/:name', (req, res) => {
  const stream = createReadStream(safePath);
  res.setHeader('Content-Type', 'application/octet-stream');
  stream.pipe(res);
  stream.on('error', (err) => {
    if (!res.headersSent) res.status(404).end();
    else res.destroy(err);
  });
});
```

ประโยชน์:

- memory คงที่โดยประมาณ (ไม่โตตามขนาดไฟล์)
- เริ่มส่งข้อมูลให้ client ได้เร็วขึ้น (TTFB)
- รองรับ backpressure ผ่าน `pipe` / `pipeline`

ดูตัวอย่าง: [`examples/02-streams-uploads/`](./examples/02-streams-uploads/)

---

## 4. Secure Multipart File Uploads

ใช้ `multer` (หรือ busboy) — **อย่าเขียน parser เอง**

Checklist ความปลอดภัย:

1. จำกัดขนาดไฟล์ (`limits.fileSize`)
2. จำกัดจำนวนไฟล์
3. Allowlist MIME / extension (อย่าเชื่อ `Content-Type` จาก client 100%)
4. เก็บนอก web root / ใช้ object storage (S3)
5. สุ่มชื่อไฟล์ — กัน path traversal และ overwrite
6. สแกน malware ในระบบจริง (ClamAV / cloud scanner)

```js
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported file type'), ok);
  },
});
```

---

## 5. Production Security — Rate Limit, Injection, XSS

### Rate limiting

```js
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests' } },
});

app.use('/api/auth', authLimiter);
```

ใน multi-instance ใช้ **Redis store** สำหรับ rate limit ร่วมกัน

### SQL / NoSQL Injection

| ชั้นป้องกัน       | วิธี                                                                            |
| ----------------- | ------------------------------------------------------------------------------- |
| ORM/query builder | ใช้ parameterized queries เสมอ — ห้ามต่อ string SQL                             |
| Validation        | allowlist field, type, ความยาว                                                  |
| Mongo-style       | ห้ามรับ object ดิบเป็น query; ใช้ `mongo-sanitize` หรือ validate เป็น primitive |

```js
// ผิด
db.raw(`SELECT * FROM users WHERE email = '${email}'`);

// ถูก
db('users').where({ email }).first();
// หรือ prisma.user.findUnique({ where: { email } })
```

### XSS ที่ API layer

API JSON โดยทั่วไปไม่ execute ใน browser โดยตรง แต่ยังควร:

- Helmet (`Content-Security-Policy` สำหรับหน้าเว็บที่เสิร์ฟจาก Express)
- Escape/encode เมื่อ server-side render
- อย่าสะท้อน input ดิบกลับใน HTML
- Validate string กัน `<script>` ถ้าต้องเก็บ HTML — ใช้ sanitizer เฉพาะทาง (DOMPurify ฝั่งที่เหมาะสม)

ดูตัวอย่าง: [`examples/03-security-hardening/`](./examples/03-security-hardening/)

---

## 6. Scalability — Cluster Module และ PM2

Node.js ใช้ 1 thread สำหรับ JS — บนเครื่อง 8 cores ควรรันหลายโปรเซส

### Cluster module

```js
import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
  const workers = Number(process.env.WEB_CONCURRENCY) || os.availableParallelism();
  for (let i = 0; i < workers; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.error(`worker ${worker.process.pid} died — restarting`);
    cluster.fork();
  });
} else {
  // import and start Express app
}
```

### PM2 (แนะนำบน VM)

```bash
pm2 start src/server.js -i max --name api
pm2 reload api # zero-downtime reload
```

ข้อควรรู้:

- Cluster/PM2 ช่วย **CPU-bound concurrency ข้ามโปรเซส** — ไม่แทนที่ horizontal scaling ข้ามเครื่อง
- In-memory state (session, rate limit) จะไม่แชร์ — ใช้ Redis
- ต้อง graceful shutdown ให้ถูกเมื่อ PM2 reload

ดูตัวอย่าง: [`examples/04-clustering-health/`](./examples/04-clustering-health/)

---

## 7. Connection Pooling และ Health Checks

### Pooling

Prisma / Knex / `pg` มี pool ในตัว:

```js
// Knex
pool: { min: 2, max: 10 }

// pg
new Pool({ max: 10, idleTimeoutMillis: 30_000 })

// Prisma — ผ่าน connection string
// postgresql://user:pass@host:5432/db?connection_limit=10
```

ขนาด pool ที่ดี ≈ ตามจำนวน workers × queries พร้อมกันที่ DB รับได้ — **อย่าเปิด max สูงเกิน DB `max_connections`**

### Health endpoints สำหรับ K8s / Docker

| Probe     | Path แนะนำ      | ตรวจอะไร                           |
| --------- | --------------- | ---------------------------------- |
| Liveness  | `/health/live`  | โปรเซสยังตอบ (ไม่ตรวจ dependency)  |
| Readiness | `/health/ready` | พร้อมรับ traffic — DB/redis ต่อได้ |

```js
app.get('/health/live', (_req, res) => res.status(200).json({ status: 'live' }));

app.get('/health/ready', async (_req, res) => {
  try {
    await db.raw('select 1');
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not_ready' });
  }
});
```

---

## 8. Best Practices สรุป

1. Error model เดียวทั้งระบบ — `AppError` + global handler + async wrapper
2. จับ `unhandledRejection` / `uncaughtException` และทำ graceful shutdown
3. ใช้ Streams/`pipeline` สำหรับไฟล์และข้อมูลใหญ่
4. Upload ต้องมี size limit + type allowlist + ชื่อไฟล์สุ่ม
5. Rate limit จุด auth และ public write endpoints
6. ห้ามต่อ string ทำ SQL/query — parameterized เท่านั้น
7. Scale ด้วย cluster/PM2 + shared store (Redis) สำหรับ state
8. แยก liveness/readiness และ tune connection pool ให้สอดคล้องจำนวน workers

---

## ขั้นตอนถัดไป

1. รันทุกตัวอย่างใน `examples/`
2. ทำ Lab ใน [`LAB.md`](./LAB.md) — Production-ready Media API
3. นำ checklist ไป audit project จริงของคุณ

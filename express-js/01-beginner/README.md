# Level 1 — Beginner: Node.js Core & Express Fundamentals

เป้าหมายระดับนี้: ให้คุณเข้าใจ **กลไกของ Node.js runtime** และสร้าง Express API พื้นฐานได้อย่างมั่นใจ
ไม่ใช่แค่ `app.get('/')` — แต่เข้าใจ Event Loop, Modules, Middleware chain และ Error handling

---

## สารบัญ

1. [Node.js Runtime และ V8 Engine](#1-nodejs-runtime-และ-v8-engine)
2. [Package Management — NPM / PNPM](#2-package-management--npm--pnpm)
3. [CommonJS vs ES Modules](#3-commonjs-vs-es-modules)
4. [Express.js Basics — App, Routing, Req/Res](#4-expressjs-basics--app-routing-reqres)
5. [Parsing JSON และ URL-encoded](#5-parsing-json-และ-url-encoded)
6. [Middleware Pattern](#6-middleware-pattern)
7. [Custom Logger Middleware](#7-custom-logger-middleware)
8. [Built-in Error Handling](#8-built-in-error-handling)
9. [Best Practices สรุป](#9-best-practices-สรุป)

---

## 1. Node.js Runtime และ V8 Engine

Node.js ไม่ใช่ภาษาใหม่ — มันคือ **JavaScript runtime** ที่รันนอก browser

```
┌─────────────────────────────────────────────┐
│     Your JS Code    │
├─────────────────────────────────────────────┤
│ Node.js APIs (fs, http, crypto, stream…) │
├──────────────────┬──────────────────────────┤
│ V8 Engine  │ libuv (Event Loop, I/O) │
│ (compile/run JS)│ (async I/O, threadpool) │
└──────────────────┴──────────────────────────┘
```

| ส่วนประกอบ    | หน้าที่                                                                            |
| ------------- | ---------------------------------------------------------------------------------- |
| **V8**        | Compile JS → machine code, จัดการ heap/GC                                          |
| **libuv**     | Event loop, non-blocking I/O, thread pool สำหรับงาน blocking (เช่น DNS, fs บางเคส) |
| **Node APIs** | ห่อระบบปฏิบัติการให้ใช้จาก JS ได้                                                  |

### Event Loop แบบเข้าใจใช้งาน

Node.js เป็น **single-threaded สำหรับ JS ของคุณ** แต่ I/O ไม่ block thread หลัก:

```js
console.log('1 sync');
setTimeout(() => console.log('2 timeout'), 0);
Promise.resolve().then(() => console.log('3 microtask'));
console.log('4 sync');
// ผลลัพธ์ทั่วไป (script/CJS): 1 → 4 → 3 → 2
```

**ESM gotcha:** ถ้าโค้ดรันใน ES Module (`"type": "module"`) microtask จาก `Promise` ที่ schedule ในระหว่าง evaluate module
อาจถูก flush **ก่อน** `process.nextTick` — ต่างจาก CommonJS ดู demo ใน [`examples/01-node-runtime/event-loop-order.js`](./examples/01-node-runtime/event-loop-order.js)

> **กฎทอง:** อย่าทำ CPU-heavy งานยาวบน event loop (เช่น crypto sync หนัก ๆ, JSON.parse ของไฟล์ GB)
> แยกไป Worker Threads / queue / service อื่น

ดูตัวอย่าง: [`examples/01-node-runtime/`](./examples/01-node-runtime/)

---

## 2. Package Management — NPM / PNPM

| เครื่องมือ | จุดเด่น                               | เมื่อไหร่ใช้                          |
| ---------- | ------------------------------------- | ------------------------------------- |
| **npm**    | มากับ Node, ทุกคนรู้จัก               | project ทั่วไป, CI มาตรฐาน            |
| **pnpm**   | disk-efficient, strict `node_modules` | monorepo, ทีมใหญ่, อยากประหยัดพื้นที่ |
| **yarn**   | historically เร็ว / workspaces        | project เดิมที่ใช้ yarn อยู่แล้ว      |

ไฟล์สำคัญ:

- `package.json` — dependencies, scripts, `"type": "module"`
- `package-lock.json` / `pnpm-lock.yaml` — **ล็อก version** เพื่อ reproducible install
- `.npmrc` — config ทีม (เช่น `engine-strict=true`)

```bash
npm init -y
npm install express
npm install -D nodemon # เฉพาะ dev
```

Best practices:

1. ล็อก major ด้วย caret (`^`) หรือ pin version ใน production ที่ต้องการความเสถียรสูง
2. แยก `dependencies` vs `devDependencies`
3. อย่า commit `node_modules` — commit lockfile แทน

---

## 3. CommonJS vs ES Modules

| มิติ            | CommonJS (`require`)                    | ES Modules (`import`/`export`)              |
| --------------- | --------------------------------------- | ------------------------------------------- |
| Syntax          | `const x = require('x')`                | `import x from 'x'`                         |
| Loading         | Synchronous, dynamic ได้ง่าย            | Static analysis ดีกว่า, top-level await ได้ |
| Default ใน Node | ไฟล์ `.cjs` หรือไม่มี `"type":"module"` | `"type":"module"` หรือนามสกุล `.mjs`        |
| Browser align   | ไม่ตรง                                  | ตรงกับมาตรฐานเว็บ                           |

**แนะนำสำหรับ project ใหม่:** ESM (`"type": "module"`)

```js
// math.js
export function add(a, b) {
  return a + b;
}

// app.js
import { add } from './math.js'; // ต้องใส่ .js ใน Node ESM
console.log(add(2, 3));
```

ข้อควรระวัง:

- ใน ESM ไม่มี `__dirname` / `__filename` โดยตรง — ใช้ `import.meta.url`
- `require()` ใน ESM ต้องสร้างผ่าน `createRequire`
- Dynamic import: `const mod = await import('./plugin.js')`

---

## 4. Express.js Basics — App, Routing, Req/Res

Express คือ **minimal web framework** ที่วางบน `http` ของ Node
หัวใจคือ **routing + middleware chain**

```js
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(3000, () => {
  console.log('listening on :3000');
});
```

### Request / Response objects

| Object                                              | ของสำคัญ                                     |
| --------------------------------------------------- | -------------------------------------------- |
| `req.method`, `req.path`, `req.params`, `req.query` | อ่าน method, path, path params, query string |
| `req.body`                                          | ต้องมี parser middleware ก่อนจึงมีค่า        |
| `req.headers`                                       | header ทั้งหมด (key เป็น lowercase)          |
| `res.status(code)`                                  | ตั้ง HTTP status                             |
| `res.json(obj)`                                     | ส่ง JSON + ตั้ง `Content-Type`               |
| `res.send(data)`                                    | ส่ง string/Buffer/object                     |

### Routing methods

```js
app.get('/users', listUsers);
app.post('/users', createUser);
app.put('/users/:id', replaceUser);
app.patch('/users/:id', updateUser);
app.delete('/users/:id', removeUser);

// Router แยกไฟล์
const usersRouter = express.Router();
usersRouter.get('/', listUsers);
app.use('/api/users', usersRouter);
```

ลำดับ route สำคัญ: Express จับ **route แรกที่ match** — วางเฉพาะเจาะจงก่อน wildcard

ดูตัวอย่าง: [`examples/02-express-basics/`](./examples/02-express-basics/)

---

## 5. Parsing JSON และ URL-encoded

โดยค่าเริ่มต้น Express **ไม่อ่าน body** — ต้องใส่ middleware:

```js
app.use(express.json({ limit: '100kb' })); // application/json
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // form
```

| Content-Type                        | Middleware                    | ได้ `req.body` เป็น |
| ----------------------------------- | ----------------------------- | ------------------- |
| `application/json`                  | `express.json()`              | object              |
| `application/x-www-form-urlencoded` | `express.urlencoded()`        | object              |
| `multipart/form-data`               | ต้องใช้ multer (ระดับ Expert) | files + fields      |

> **Security tip:** จำกัด `limit` เสมอ — ป้องกัน payload ใหญ่จนกิน memory

---

## 6. Middleware Pattern

Middleware คือ function `(req, res, next) => {}` ที่ทำงานเป็น **pipeline**

```
Request → [logger] → [json parser] → [auth?] → [route handler] → Response
       ↓ error
     [error middleware]
```

```js
function timing(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next(); // สำคัญ! ถ้าไม่เรียก request จะค้าง
}

app.use(timing);
```

ประเภท middleware:

1. **Application-level** — `app.use(fn)`
2. **Router-level** — `router.use(fn)`
3. **Route-level** — `app.get('/x', mw1, mw2, handler)`
4. **Error-handling** — มี 4 params: `(err, req, res, next)`

ดูตัวอย่าง: [`examples/03-middleware-pattern/`](./examples/03-middleware-pattern/)

---

## 7. Custom Logger Middleware

Logger ที่ดีไม่ควรแค่ `console.log` ดิบ ๆ — ควรมี:

- method, path, status, duration
- request id (สำหรับ trace ข้ามบริการ)
- อย่า log secrets (Authorization, cookie, password)

```js
import { randomUUID } from 'node:crypto';

export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] ?? randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      JSON.stringify({
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(ms * 100) / 100,
      }),
    );
  });
  next();
}
```

---

## 8. Built-in Error Handling

Express จับ error ได้เมื่อ:

1. คุณเรียก `next(err)`
2. หรือ throw ใน sync middleware/handler
3. หรือ (Express 5) reject จาก async handler — **Express 4 ต้องห่อเอง**

```js
// Error middleware — ต้องมี 4 arguments
function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode ?? 500;
  const payload = {
    error: {
      message: status >= 500 ? 'Internal Server Error' : err.message,
      requestId: req.requestId,
    },
  };
  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.error.stack = err.stack;
  }
  res.status(status).json(payload);
}

app.use(errorHandler); // ต้องอยู่ท้ายสุด
```

Async wrapper สำหรับ Express 4:

```js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await findUser(req.params.id);
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }
    res.json(user);
  }),
);
```

ดูตัวอย่าง: [`examples/04-error-handling/`](./examples/04-error-handling/)

---

## 9. Best Practices สรุป

1. ใช้ **ESM** สำหรับ project ใหม่ และระบุ `"engines": { "node": ">=20" }`
2. แยก Router ตาม resource (`/users`, `/orders`) — อย่าใส่ทุก route ในไฟล์เดียว
3. ตั้ง `express.json({ limit })` และอย่า trust `req.body` โดยไม่ validate (เรียนรู้เต็มใน Intermediate)
4. Middleware เรียงลำดับให้ถูก: security/parsers → logger → routes → 404 → error handler
5. ตอบ JSON error shape ให้สม่ำเสมอ และมี `requestId`
6. อย่าใช้ `app.listen` ในไฟล์ที่ต้อง unit test — export `app` แล้ว listen ใน `server.js` แยก

---

## ขั้นตอนถัดไป

1. รันทุกตัวอย่างใน `examples/`
2. ทำ Lab ใน [`LAB.md`](./LAB.md) — สร้าง Mini Task API
3. เมื่อเข้าใจ middleware chain และ error flow แล้ว → ไป [`02-intermediate/`](../02-intermediate/)

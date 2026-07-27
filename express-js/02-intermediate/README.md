# Level 2 — Intermediate: Data Persistence, Validation & Authentication

เป้าหมายระดับนี้: สร้าง Express API แบบ **enterprise-ready พื้นฐาน**
ด้วย Layered Architecture, ORM/migrations, schema validation และ JWT authentication

---

## สารบัญ

1. [Layered Architecture — Controller / Service / Repository](#1-layered-architecture--controller--service--repository)
2. [Data Access Layer — Prisma / Knex](#2-data-access-layer--prisma--knex)
3. [Database Migrations](#3-database-migrations)
4. [Request Sanitization & Validation — Zod / Joi](#4-request-sanitization--validation--zod--joi)
5. [JWT Authentication และ Token Lifecycle](#5-jwt-authentication-และ-token-lifecycle)
6. [Secure Headers — CORS & Helmet](#6-secure-headers--cors--helmet)
7. [Best Practices สรุป](#7-best-practices-สรุป)

---

## 1. Layered Architecture — Controller / Service / Repository

เมื่อ API โตขึ้น การยัด logic ทั้งหมดใน route handler จะทำให้:

- ทดสอบยาก (ต้อง mock `req`/`res`)
- เปลี่ยน DB แล้วกระทบทั้งไฟล์
- business rules กระจายและซ้ำ

### แยกความรับผิดชอบ

```
HTTP Request
 ↓
Router ────────── ผูก path ↔ middleware ↔ controller
 ↓
Controller ────── แปลง HTTP ↔ DTO, เรียก service, ตั้ง status code
 ↓
Service ───────── business rules, orchestration, transactions
 ↓
Repository ────── คุยกับ DB / ORM เท่านั้น
 ↓
Database
```

| ชั้น       | รู้จัก                                       | ห้ามรู้จัก                |
| ---------- | -------------------------------------------- | ------------------------- |
| Controller | `req`/`res`, status codes, validation result | SQL, Prisma client โดยตรง |
| Service    | domain rules, entities                       | Express objects           |
| Repository | DB queries                                   | HTTP status, JWT, headers |

```js
// controller — บาง, ไม่มี business rule
export async function createProduct(req, res) {
  const product = await productService.create(req.body);
  res.status(201).json({ data: product });
}

// service — กฎธุรกิจ
export async function create(input) {
  const existing = await productRepo.findBySku(input.sku);
  if (existing) throw new HttpError(409, 'SKU already exists');
  return productRepo.insert(input);
}

// repository — เฉพาะ data access
export async function insert(data) {
  return prisma.product.create({ data });
}
```

> **กฎทอง:** ถ้าเปลี่ยนจาก Express ไป Fastify แล้วต้องแก้ Service — แสดงว่า coupling ผิดชั้น

ดูตัวอย่าง: [`examples/01-layered-architecture/`](./examples/01-layered-architecture/)

---

## 2. Data Access Layer — Prisma / Knex

| เครื่องมือ           | รูปแบบ             | จุดเด่น                                    |
| -------------------- | ------------------ | ------------------------------------------ |
| **Prisma**           | ORM + schema-first | DX ดี, type-safe client, migrate ชัด       |
| **Knex**             | Query builder      | SQL ใกล้เคียง, ยืดหยุ่น, migrations ในตัว  |
| **node-pg / mysql2** | Driver ดิบ         | ควบคุมเต็มที่ แต่ต้องเขียน SQL/mapping เอง |

### Prisma (แนะนำเริ่มต้นสำหรับ API สมัยใหม่)

```prisma
// schema.prisma
generator client {
 provider = "prisma-client-js"
}

datasource db {
 provider = "postgresql"
 url  = env("DATABASE_URL")
}

model User {
 id   String @id @default(cuid())
 email  String @unique
 passwordHash String
 name   String
 createdAt DateTime @default(now())
 products  Product[]
}

model Product {
 id  String @id @default(cuid())
 sku  String @unique
 name  String
 price  Int
 ownerId String
 owner  User  @relation(fields: [ownerId], references: [id])
 createdAt DateTime @default(now())
}
```

```js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

export async function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}
```

### Knex (เมื่อต้องการ SQL ชัด / reporting ซับซ้อน)

```js
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
});

export function findUserByEmail(email) {
  return db('users').where({ email }).first();
}
```

ดูตัวอย่าง: [`examples/02-data-access/`](./examples/02-data-access/)

---

## 3. Database Migrations

Migration = **version ของ schema** ที่ทีมใช้ร่วมกันและ replay ได้ในทุก environment

```bash
# Prisma
npx prisma migrate dev --name init
npx prisma generate
npx prisma migrate deploy # production

# Knex
npx knex migrate:make create_users
npx knex migrate:latest
```

แนวทางที่ดี:

1. **อย่าแก้ migration ที่ deploy ไปแล้ว** — สร้างไฟล์ใหม่
2. Migration ควร **backward-compatible** เมื่อทำ zero-downtime deploy (expand/contract)
3. แยก seed ออกจาก migrate
4. ใน CI: รัน migrate ก่อนทดสอบ integration

สำหรับ lab นี้ ตัวอย่าง Prisma ใช้ **SQLite ไฟล์** เพื่อรันได้ทันทีโดยไม่ต้องพึ่ง Docker
สลับเป็น PostgreSQL ได้ด้วยการเปลี่ยน `provider` + `DATABASE_URL` (ดู `docker-compose.yml` ที่ root)

---

## 4. Request Sanitization & Validation — Zod / Joi

**อย่า trust input จาก client** — ทุก field อาจเป็น type ผิด, ยาวเกิน, หรือมี payload แปลก

### Zod (แนะนำคู่กับ TypeScript / ESM สมัยใหม่)

```js
import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(1).max(120),
  price: z.number().int().positive().max(1_000_000_00),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: parsed.error.flatten(),
        },
      });
    }
    req.body = parsed.data; // sanitized
    return next();
  };
}
```

### Joi

```js
import Joi from 'joi';

export const createProductSchema = Joi.object({
  sku: Joi.string()
    .trim()
    .pattern(/^[A-Z0-9-]+$/)
    .required(),
  name: Joi.string().trim().max(120).required(),
  price: Joi.number().integer().positive().required(),
}).unknown(false); // ปฏิเสธ field แปลก
```

จุดสำคัญของ sanitization:

- `trim()` string
- จำกัดความยาว / ช่วงตัวเลข
- `unknown(false)` หรือ `.strict()` เพื่อกัน mass-assignment
- แยก schema ตาม use case: `create` vs `update` (partial)

ดูตัวอย่าง: [`examples/03-validation/`](./examples/03-validation/)

---

## 5. JWT Authentication และ Token Lifecycle

JWT = token ที่ server ลงลายเซ็น (HMAC/RSA) ให้ client ถือไปใส่ใน `Authorization: Bearer <token>`

```
Register/Login → server ตรวจ credentials → ออก access token (+ refresh ถ้ามี)
Client เรียก API พร้อม Bearer token
Auth middleware ตรวจลายเซ็น + expiry → ใส่ req.user
```

### Access vs Refresh

| Token   | อายุสั้น/ยาว                              | เก็บที่ไหน                     | หน้าที่        |
| ------- | ----------------------------------------- | ------------------------------ | -------------- |
| Access  | สั้น (5–15 นาที หรือ 1 ชม. ตามความเสี่ยง) | memory / Authorization header  | เรียก API      |
| Refresh | ยาวกว่า                                   | httpOnly Secure cookie (แนะนำ) | ขอ access ใหม่ |

```js
import jwt from 'jsonwebtoken';

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m',
    issuer: 'express-bootcamp',
    audience: 'api',
  });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Unauthorized' } });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
      issuer: 'express-bootcamp',
      audience: 'api',
    });
    return next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}
```

Lifecycle ที่ควรคิด:

1. **Login** — ตรวจ password hash (bcrypt), ออก token
2. **Protected routes** — middleware ตรวจ token
3. **Logout** — ฝั่ง stateless JWT ทำได้จำกัด (ลบฝั่ง client / blacklist / short expiry)
4. **Rotate secrets** — รองรับ `JWT_SECRET` หลายตัวช่วง rotate
5. **อย่าใส่ sensitive data ใน JWT payload** — อ่านได้โดยไม่ต้องมี secret (แค่ Base64)

ดูตัวอย่าง: [`examples/04-auth-jwt/`](./examples/04-auth-jwt/)

---

## 6. Secure Headers — CORS & Helmet

### Helmet

ตั้ง HTTP headers ลดความเสี่ยง XSS, clickjacking, MIME sniffing ฯลฯ

```js
import helmet from 'helmet';
app.use(helmet());
```

### CORS

เปิดให้ origin ที่ไว้ใจเท่านั้น — อย่าใช้ `origin: '*'` คู่กับ credentials

```js
import cors from 'cors';

app.use(
  cors({
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  }),
);
```

Checklist ความปลอดภัยระดับ Intermediate:

- [ ] Password hash ด้วย bcrypt/argon2 — ห้ามเก็บ plain text
- [ ] JWT secret ยาวและสุ่ม จาก env — ห้าม hardcode
- [ ] Helmet เปิด
- [ ] CORS allowlist
- [ ] Validate ทุก write endpoint
- [ ] ไม่ส่ง `passwordHash` กลับใน response

---

## 7. Best Practices สรุป

1. **Dependency direction:** Router → Controller → Service → Repository (ไม่ย้อนกลับ)
2. **Thin controllers** — ไม่มี if ธุรกิจยาว ๆ
3. **Validate ที่ขอบ** แล้วส่งข้อมูลที่ sanitized เข้า service
4. **Repository เป็นที่เดียวที่รู้จัก ORM** — เปลี่ยน Prisma ↔ Knex ได้โดยไม่แตะ controller
5. **Auth เป็น middleware** ไม่ copy-paste verify ในทุก handler
6. **Config จาก env** (`JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`)

---

## ขั้นตอนถัดไป

1. รันตัวอย่าง layered / validation / auth
2. (ถ้ามี Docker) ลอง Prisma กับ PostgreSQL จาก `docker-compose.yml`
3. ทำ Lab ใน [`LAB.md`](./LAB.md) — Catalog API พร้อม JWT
4. เมื่อพร้อม → [`03-expert/`](../03-expert/)

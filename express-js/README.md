📍 **Nav:** [`🏠 Dev Learning Courses Hub`](https://github.com/worapha05/dev-learning-courses-hub/blob/main/README.md) | [`📂 Backend Courses Index`](../README.md) | [`📝 Prompt File`](https://github.com/worapha05/ai-learning-prompts-hub/blob/main/course-generation/backend-courses/express-js-prompt.md)

---

# Node.js & Express Bootcamp — Zero to Expert

bootcamp เรียนรู้ **Node.js Runtime และ Express.js** แบบครบวงจร
เน้น **Clean Architecture, Security และ Enterprise-grade API Development**
จาก Fundamentals → Layered Architecture / Auth → Performance / Hardening / Scale

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- อธิบายกลไกของ **Node.js (V8, Event Loop, Modules)** และเลือก CommonJS / ESM อย่างมีเหตุผล
- สร้าง Express API ที่ใช้ **Middleware Pattern** และจัดการ error อย่างเป็นระบบ
- ออกแบบแอปด้วย **Controller–Service–Repository** พร้อม validation (Zod/Joi) และ JWT auth
- เชื่อมฐานข้อมูลผ่าน **Prisma / Knex** พร้อม migrations และ connection pooling
- Hardening production ด้วย **Helmet, CORS, Rate Limiting, Streams, Cluster/PM2** และ health checks

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                                                 | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | ---------------------------------------------------------- | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | Node runtime, Express basics, Middleware, Error handling   | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | Layered architecture, Prisma/Knex, Zod validation, JWT     | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | Async errors, Streams/uploads, Security hardening, Cluster | 2–4 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย เน้นกลไก Node.js และสถาปัตยกรรม Express
2. **`examples/`** — โค้ด JavaScript (ESM) / TypeScript ที่รันได้จริง
3. **`LAB.md`** — โจทย์กรณีศึกษาจริงพร้อมเฉลยเต็มใน `lab/solution/`

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐาน JavaScript (async/await, Promise, object/array)
- ความเข้าใจ HTTP / JSON และ REST แบบคร่าว ๆ
- ติดตั้ง [Node.js 20+](https://nodejs.org/) และ (แนะนำ) [Docker](https://www.docker.com/) สำหรับ PostgreSQL

```bash
node -v # ควรเป็น v20.x ขึ้นไป
npm -v
docker --version # optional — สำหรับ DB ในระดับ Intermediate+
```

---

## วิธีใช้ Bootcamp

1. ติดตั้ง dependencies ที่ root ของ bootcamp
2. อ่าน `README.md` ของระดับนั้นให้จบ — โฟกัสที่ **ทำไมออกแบบแบบนี้**
3. รันตัวอย่างใน `examples/` ตามลำดับ
4. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลย
5. ไประดับถัดไปเมื่ออธิบาย trade-off ของการออกแบบได้

```bash
cd nodejs-express-bootcamp
npm install

# Beginner — Express basics
npm run beginner:express

# Intermediate — Layered API (in-memory)
npm run intermediate:layered

# Expert — Security hardening demo
npm run expert:security
```

| บริการ (Docker) | Host Port | Credentials / Notes                                       |
| --------------- | --------- | --------------------------------------------------------- |
| PostgreSQL      | `5432`    | user `bootcamp` / pass `bootcamp` / db `express_bootcamp` |

```bash
npm run docker:up
# DATABASE_URL=postgresql://bootcamp:bootcamp@localhost:5432/express_bootcamp
```

---

## Learning Path ที่แนะนำ

```
Beginner: Runtime + Express + Middleware + Error Handling
 ↓
Intermediate: Layered Architecture + DB + Validation + JWT
 ↓
Expert: Async Excellence + Streams + Hardening + Cluster/Health
 ↓
project จริงของคุณเอง (REST API / SaaS Backend / Internal BFF)
```

---

## เมื่อไหร่ใช้ Express อย่างเดียว vs Framework อื่น?

| คำถาม                                                          | แนวทาง                  |
| -------------------------------------------------------------- | ----------------------- |
| ต้องการควบคุม middleware / routing เต็มที่ และทีมคุ้น Express? | Express                 |
| ต้องการ type-safety + schema validation ในตัว (OpenAPI)?       | Fastify / NestJS / tRPC |
| ต้องการ convention + DI + module structure ชัด?                | NestJS                  |
| API เล็ก ๆ / BFF / prototype เร็ว?                             | Express หรือ Hono       |

> **กฎทอง:** Express ไม่ใช่ “ล้าสมัย” — มันเป็น **foundation** ที่เข้าใจแล้วจะย้ายไป framework อื่นได้ง่าย
> สิ่งที่สำคัญกว่าชื่อ framework คือ **architecture, validation, auth และ error model**

---

## Best Practices ข้ามระดับ (สรุปเร็ว)

1. **แยกชั้น** — Route/Controller ไม่คุยกับ DB โดยตรง; Service ไม่รู้จัก Express `req`/`res`
2. **Validate ที่ขอบระบบ** — ทุก input จากภายนอกผ่าน schema (Zod/Joi) ก่อนเข้า business logic
3. **Fail safely** — error handler กลาง; อย่า leak stack trace ใน production
4. **Secure by default** — Helmet, CORS allowlist, rate limit, hashed passwords, short-lived JWT
5. **ออกแบบเพื่อ ops** — health/ready probes, structured logs, graceful shutdown

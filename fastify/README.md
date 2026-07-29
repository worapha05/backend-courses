📍 **Nav:** [`🏠 Dev Learning Courses Hub`](https://github.com/worapha05/dev-learning-courses-hub/blob/main/README.md) | [`📂 Backend Courses Index`](../README.md) | [`📝 Prompt File`](https://github.com/worapha05/ai-learning-prompts-hub/blob/main/course-generation/backend-courses/fastify-prompt.md)

---

# Fastify Performance Bootcamp — Zero to Expert

bootcamp เรียนรู้ **Fastify** แบบครบวงจร
เน้น **Low-Overhead Mechanics, Plugin Encapsulation, Schema-Driven APIs และ Production Hardening**
จาก Core Routing → Schema & Hooks → Enterprise Scaling

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- อธิบายได้ว่าทำไม Fastify เร็วกว่า Express (avoidance of overhead, `find-my-way`, `fast-json-stringify`)
- ออกแบบระบบด้วยกฎ **"Everything is a Plugin"** และใช้ Encapsulation / `fastify-plugin` อย่างถูกต้อง
- เขียน JSON Schema สำหรับ validation + response serialization (Ajv) แบบ declarative
- ใช้ Lifecycle Hooks แทน middleware แบบ Express และเชื่อม DB / Pino ผ่าน plugins
- ออกแบบ Hexagonal/Clean Architecture ด้วย nested plugins, ปรับแต่งประสิทธิภาพ และ harden สำหรับ production

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                                                  | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | Express vs Fastify, Routing/Lifecycle, Plugin Encapsulation | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | JSON Schema/Ajv, Lifecycle Hooks, DB plugins, Pino          | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | Hexagonal plugins, Performance tuning, Security & Ops       | 2–4 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย (Low Overhead, Encapsulation, Data Flow, Best Practices)
2. **`examples/`** — โค้ด TypeScript (ESM) ที่รันได้จริง
3. **`LAB.md`** — โจทย์สถานการณ์จริงพร้อมเฉลยเต็มใน `lab/solution/`

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐาน TypeScript / JavaScript (async/await, Promise, modules)
- ความเข้าใจ HTTP / JSON และ REST แบบคร่าว ๆ
- แนะนำให้เคยใช้ Express มาบ้าง (เพื่อเปรียบเทียบ overhead)
- ติดตั้ง [Node.js 20+](https://nodejs.org/)

```bash
node -v # ควรเป็น v20.x ขึ้นไป
npm -v
```

---

## วิธีใช้ Bootcamp

1. ติดตั้ง dependencies ที่ root ของ bootcamp
2. อ่าน `README.md` ของระดับนั้นให้จบ — โฟกัสที่ **ทำไม Fastify ออกแบบแบบนี้**
3. รันตัวอย่างใน `examples/` ตามลำดับ
4. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลย
5. ไประดับถัดไปเมื่ออธิบาย trade-off ของ Encapsulation และ Schema ได้

```bash
cd fastify-performance-bootcamp
npm install

# Beginner
npm run beginner:routing
npm run beginner:plugins
npm run beginner:lab

# Intermediate
npm run intermediate:schema
npm run intermediate:hooks
npm run intermediate:db
npm run intermediate:lab

# Expert
npm run expert:hexagonal
npm run expert:tuning
npm run expert:hardening
npm run expert:lab

# Type-check ทั้ง bootcamp
npm run typecheck
```

---

## แผนที่แนวคิด (Mental Model)

```
Incoming HTTP Request
 │
 ▼
┌───────────────────┐
│   find-my-way     │ ← radix-tree router (O(n) path matching)
│   (Radix Tree)    │
└─────────┬─────────┘
          │
          ▼
┌──────────────────────────────┐
│ Lifecycle Hooks              │ onRequest → preParsing → preValidation
│ (per encapsulation)          │ → preHandler → handler → onSend → onResponse
└─────────┬────────────────────┘
          │
          ▼
┌───────────────────┐
│ Ajv Validation    │ body / querystring / params / headers
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Route Handler     │ business logic (async, non-blocking)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ fast-json-        │ compiled serializer จาก response schema
│ stringify         │
└─────────┬─────────┘
          │
          ▼
HTTP Response (+ Pino structured log)
```

---

## Learning Path แนะนำ

| สัปดาห์ | โฟกัส                          | Deliverable                                               |
| ------- | ------------------------------ | --------------------------------------------------------- |
| 1       | Core + Plugins                 | Mini API พร้อม encapsulation ถูกขอบเขต                    |
| 2–3     | Schema + Hooks + DB            | API ที่มี validation/serialization + graceful shutdown    |
| 4–6     | Hexagonal + Tuning + Hardening | Production-ready service พร้อม rate limit / error handler |

---

## สิ่งที่หลักสูตรนี้ **ไม่** ครอบคลุมลึก

- ORM เฉพาะเจาะจง (Prisma/TypeORM) — ใช้ abstraction ผ่าน plugin แทน
- Frontend / SSR
- Kubernetes operators เต็มรูปแบบ — เน้น zero-downtime registration pattern ในโค้ด

---

## ใบอนุญาตการเรียนรู้

ใช้เพื่อการศึกษาและฝึกออกแบบระบบได้เต็มที่
โค้ดตัวอย่างตั้งใจให้สั้น อ่านง่าย และแสดง **กลไกของ Fastify** ชัดเจน ไม่ใช่ boilerplate production ทั้งก้อน

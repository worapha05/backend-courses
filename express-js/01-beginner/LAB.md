# Lab 1 — Mini Task API (TaskBoard Lite)

## สถานการณ์

ทีม startup ต้องการ API จัดการงาน (tasks) สำหรับแอปมือถือรุ่นแรก
คุณเป็น backend engineer คนแรก — ต้องสร้าง Express API ที่:

- รองรับ CRUD ของ tasks
- มี request logger พร้อม `X-Request-Id`
- มี error handling กลางและ 404 ที่สม่ำเสมอ
- แยก Router ออกจาก `server.js`

**อย่าดูเฉลยก่อน** — ลองทำเองใน folder ว่าง แล้วค่อยเทียบกับ `lab/solution/`

---

## โจทย์

### ส่วน A — API Endpoints

| Method   | Path             | พฤติกรรม                                                                        |
| -------- | ---------------- | ------------------------------------------------------------------------------- |
| `GET`    | `/health`        | `{ ok: true }`                                                                  |
| `GET`    | `/api/tasks`     | รายการ tasks ทั้งหมด; รองรับ `?status=todo\|doing\|done`                        |
| `GET`    | `/api/tasks/:id` | รายละเอียด task; 404 ถ้าไม่เจอ                                                  |
| `POST`   | `/api/tasks`     | สร้าง task จาก `{ title, status? }` — `title` บังคับ, `status` default = `todo` |
| `PATCH`  | `/api/tasks/:id` | update `title` และ/หรือ `status`                                                |
| `DELETE` | `/api/tasks/:id` | ลบ task                                                                         |

ข้อกำหนดเพิ่ม:

1. `status` ต้องเป็นหนึ่งใน `todo | doing | done` เท่านั้น — ไม่งั้น `400`
2. Response สำเร็จห่อด้วย `{ data: ... }`
3. Error ใช้รูป `{ error: { message, status?, requestId? } }`
4. เก็บข้อมูลใน memory (array/Map) ก็ได้ — ยังไม่ต้องมี DB

### ส่วน B — Middleware

1. สร้าง `requestLogger` ที่:

- อ่าน/สร้าง `X-Request-Id`
- log เป็น JSON เมื่อ response จบ (method, path, status, durationMs, requestId)

2. วาง middleware ลำดับ: logger → json parser → routes → 404 → error handler

### ส่วน C — Error Model

1. สร้าง class `HttpError(status, message)`
2. ใช้ `asyncHandler` แม้ handler จะ sync เป็นส่วนใหญ่ — ฝึก pattern
3. Error middleware ซ่อน stack ในโหมด `NODE_ENV=production`

---

## Acceptance Criteria

- [ ] `POST /api/tasks` ด้วย body ไม่มี `title` ได้ `400`
- [ ] `GET /api/tasks?status=done` กรองถูกต้อง
- [ ] `GET /api/tasks/unknown` ได้ `404` และมี `requestId` ใน body หรือ header
- [ ] ทุก response มี header `X-Request-Id`
- [ ] ไม่มี `app.get` กองรวมในไฟล์เดียวเกินความจำเป็น — มี `tasks.router.js`

---

## วิธีทดสอบด้วยตัวเอง

```bash
node 01-beginner/lab/solution/server.js
# หรือโค้ดของคุณเอง

curl -s http://localhost:3010/health
curl -s -X POST http://localhost:3010/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"เขียน README"}'
curl -s 'http://localhost:3010/api/tasks?status=todo'
```

---

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

จุดที่ควรเทียบกับคำตอบของคุณ:

1. แยก `HttpError` / `asyncHandler` / `errorHandler` / router
2. validate `status` ที่ขอบของ API ก่อน mutate state
3. logger ใช้ `res.on('finish')` ไม่ใช่ก่อน `next()` อย่างเดียว — ไม่งั้นได้ status ไม่ครบ

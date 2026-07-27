# Lab 3 — Production Media Gateway (AetherUpload)

## สถานการณ์

platform Aether ต้องการ **Media Gateway** สำหรับ upload เอกสาร/รูป และ download แบบ stream
คืนนี้ระบบเจอปัญหาใน staging:

1. upload ไฟล์ใหญ่ทำให้ memory พุ่ง
2. มีคนยิง `/api/upload` รัว ๆ จน CPU เต็ม
3. มี payload พยายาม inject `$gt` ใน JSON body
4. K8s ยังไม่มี readiness ที่ตรวจ dependency

คุณต้อง harden และส่งมอบ API ที่พร้อม probe + rate limit + safe upload

---

## โจทย์

สร้าง Express app (single process ก็ได้สำหรับ lab — cluster เป็นโบนัส) ที่:

### Endpoints

| Method | Path               | พฤติกรรม                                                                                   |
| ------ | ------------------ | ------------------------------------------------------------------------------------------ |
| `GET`  | `/health/live`     | 200 เสมอถ้าโปรเซสยังอยู่                                                                   |
| `GET`  | `/health/ready`    | 200 ถ้า `READY!=0`; ไม่เช่นนั้น 503                                                        |
| `POST` | `/api/upload`      | multipart field `file` — จำกัด 1MB, allowlist `image/png`, `image/jpeg`, `application/pdf` |
| `GET`  | `/api/files/:name` | stream ไฟล์จาก `uploads/` — กัน path traversal                                             |
| `POST` | `/api/notes`       | รับ `{ title, body }` — sanitize กัน `$` keys + ปฏิเสธ HTML/JS อันตรายใน `body`            |

### ความต้องการด้านความปลอดภัย / ความทนทาน

1. Helmet + CORS allowlist
2. Rate limit เฉพาะ `/api/upload` (เช่น 10 req / นาที / IP)
3. Global error handler + `asyncHandler` + `AppError`
4. Process guards สำหรับ `unhandledRejection` (log เป็น JSON)
5. ชื่อไฟล์ที่เก็บต้องสุ่ม (UUID) — ห้ามใช้ `originalname` ตรง ๆ
6. Graceful shutdown บน `SIGTERM`

### โบนัส

- ห่อด้วย `cluster.js` ให้รัน `WEB_CONCURRENCY=2`
- Structured request log พร้อม `requestId`

---

## Acceptance Criteria

- [ ] upload ไฟล์ `.exe` หรือ MIME นอก allowlist ได้ `400`
- [ ] `GET /api/files/../../etc/passwd` ไม่หลุดนอก folder uploads
- [ ] `POST /api/notes` ด้วย `{ "title": "x", "body": "<script>alert(1)</script>" }` ได้ `400`
- [ ] `POST /api/notes` ด้วย `{ "title": "x", "$where": "1", "body": "ok" }` — `$where` หายหลัง sanitize หรือถูกปฏิเสธ
- [ ] `READY=0` แล้ว `/health/ready` เป็น `503` แต่ `/health/live` ยัง `200`

---

## วิธีทดสอบ

```bash
npm run expert:lab

curl -s localhost:3050/health/live
READY=0 node 03-expert/lab/solution/src/server.js # คนละเทอร์มินัล แล้วลอง ready

curl -s -F file=@./somefile.png localhost:3050/api/upload
curl -s -X POST localhost:3050/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"n1","body":"hello"}'
```

---

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

จุดที่เฉลยเน้น:

1. `path.basename` ก่อน join path download
2. แยก liveness / readiness ให้ orchestrator restart ถูกชั้น
3. Rate limit ที่ขอบของ upload ไม่ใช่ทุก route แบบเดียวกัน
4. Sanitize + XSS guard เป็น defense-in-depth คู่กับ validation

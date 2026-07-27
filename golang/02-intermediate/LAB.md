# Lab — Intermediate: Secure Notes API

## เป้าหมาย

สร้าง **Secure Notes API** ด้วย Gin (หรือ Fiber ก็ได้ ถ้าเลือกแล้วไปให้สุดทาง)
ครอบคลุม: routing, middleware, JWT, CORS, และ file upload

> Lab นี้ใช้ **in-memory store** ได้ เพื่อโฟกัส auth/integration
> ถ้ามี Postgres ให้ลองต่อ GORM หรือ SQLx เป็นโบนัส

---

## โจทย์

### Endpoints

| Method   | Path                    | Auth    | คำอธิบาย                            |
| -------- | ----------------------- | ------- | ----------------------------------- |
| `POST`   | `/auth/register`        | ไม่ต้อง | สมัครด้วย email + password          |
| `POST`   | `/auth/login`           | ไม่ต้อง | ได้ JWT + ตั้ง cookie session       |
| `GET`    | `/notes`                | JWT     | รายการโน้ตของ user ปัจจุบันเท่านั้น |
| `POST`   | `/notes`                | JWT     | สร้างโน้ต `{ "title", "body" }`     |
| `DELETE` | `/notes/:id`            | JWT     | ลบโน้ตของตัวเองเท่านั้น             |
| `POST`   | `/notes/:id/attachment` | JWT     | upload ไฟล์แนบ (field `file`)       |

### ข้อกำหนดบังคับ

1. **CORS** allow `http://localhost:5173` พร้อม `AllowCredentials: true`
2. Password ต้อง hash ด้วย **bcrypt**
3. JWT HS256 อายุไม่เกิน 15 นาที
4. Middleware ตรวจ Bearer token แล้วใส่ `userID` ใน context
5. Upload จำกัดขนาด ≤ 5MB และอนุญาตเฉพาะ `.png`, `.jpg`, `.jpeg`, `.pdf`
6. Response error เป็น JSON รูปแบบ `{"error":"..."}`

### โบนัส (คะแนนพิเศษ)

- [ ] เก็บโน้ตใน Postgres ด้วย GORM หรือ SQLx
- [ ] เพิ่ม migration file สำหรับตาราง `notes`
- [ ] Refresh ด้วย cookie session (`GET /session/me`)

---

## ทดสอบด้วยมือ

```bash
# สมัคร
curl -s -X POST localhost:8090/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@dev.com","password":"secret123"}'

# ล็อกอิน
TOKEN=$(curl -s -X POST localhost:8090/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@dev.com","password":"secret123"}' | jq -r .access_token)

# สร้างโน้ต
curl -s -X POST localhost:8090/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Lab 2","body":"JWT works"}'

# upload
curl -s -X POST localhost:8090/notes/ \
  -H "Authorization: Bearer $TOKEN" \
  -F file=@./readme.txt < NOTE_ID > /attachment
```

---

## เกณฑ์ผ่าน

- [ ] User คน A มองไม่เห็น / ลบโน้ตของคน B ไม่ได้
- [ ] Request ไม่มี token ได้ 401
- [ ] ไฟล์ใหญ่เกินหรือนามสกุลผิดได้ 400
- [ ] Frontend origin อื่นถูก CORS บล็อก (ทดสอบจาก browser)

## เฉลย

ดู [`lab/solution/`](./lab/solution/)

```bash
cd lab/solution
go mod tidy
go run .
```


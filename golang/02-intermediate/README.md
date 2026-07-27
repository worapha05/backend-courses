# Level 2 — Intermediate: Frameworks, Databases & Full-stack Integration

ระดับนี้พาคุณจาก `net/http` สู่ **เครื่องมือที่ทีม production ใช้จริง**
โฟกัสที่ API ที่แข็งแรง, persistence ที่ถูกต้อง และการเชื่อมกับ Frontend

---

## สารบัญ

1. [Fiber vs Gin — เลือกอย่างไร](#1-fiber-vs-gin--เลือกอย่างไร)
2. [Routing & Middleware Design](#2-routing--middleware-design)
3. [GORM vs SQLx](#3-gorm-vs-sqlx)
4. [Connection Pooling](#4-connection-pooling)
5. [Database Migrations](#5-database-migrations)
6. [CORS สำหรับ Frontend](#6-cors-สำหรับ-frontend)
7. [Cookie Session vs JWT](#7-cookie-session-vs-jwt)
8. [File Uploader Endpoint](#8-file-uploader-endpoint)
9. [Best Practices สรุป](#9-best-practices-สรุป)

---

## 1. Fiber vs Gin — เลือกอย่างไร

|                                       | **Fiber**            | **Gin**                     |
| ------------------------------------- | -------------------- | --------------------------- |
| สไตล์                                 | คล้าย Express.js     | ใกล้ net/http + performance |
| Base                                  | fasthttp             | net/http                    |
| เรียนรู้เร็วสำหรับ JS/TS dev          | สูงมาก               | สูง                         |
| Ecosystem / เอกสารอายุยาว             | ดี                   | ดีมาก (mature)              |
| Compatibility กับ net/http middleware | จำกัดกว่า (fasthttp) | ดีเยี่ยม                    |

**คำแนะนำ:**

- มาจาก Node/Express → เริ่ม Fiber จะรู้สึกคุ้น
- ต้องการเข้ากับ ecosystem Go มาตรฐาน / lib ที่ใช้ `http.Handler` → เลือก Gin
- project จริง: **เลือกหนึ่งแล้วไปให้สุด** อย่าผสมโดยไม่จำเป็น

ทั้งสองตัวแก้ปัญหาเดียวกัน: routing, middleware chain, binding JSON, status helpers

---

## 2. Routing & Middleware Design

### Middleware คืออะไร

function ที่ครอบ request pipeline:

```
Request → Logger → CORS → Auth → Handler → Response
```

หลักการออกแบบที่ดี:

1. **หนึ่ง middleware = หนึ่งหน้าที่** (อย่าทำ auth+log+metrics ในก้อนเดียว)
2. **Fail fast** — ถ้า auth ไม่ผ่าน ให้ return ทันที
3. **ใส่ค่าลง context** — เช่น `userID` หลัง verify JWT
4. **อย่ากลืน panic** โดยไม่ recover ที่ขอบนอกสุด

### ตัวอย่างแนวคิด (pseudo)

```go
func AuthRequired(next http.Handler) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  token := extractBearer(r)
  claims, err := parseJWT(token)
  if err != nil {
   http.Error(w, "unauthorized", http.StatusUnauthorized)
   return
  }
  ctx := context.WithValue(r.Context(), userKey, claims.Subject)
  next.ServeHTTP(w, r.WithContext(ctx))
 })
}
```

Fiber/Gin มี API คนละแบบ แต่แนวคิดเดียวกัน

---

## 3. GORM vs SQLx

### GORM (ORM)

ข้อดี:

- Model-centric, CRUD เร็ว
- Association, hook, soft delete สะดวก
- AutoMigrate ใช้ได้ตอนต้น project

ข้อเสีย:

- Query ซับซ้อนอาจซ่อน N+1
- ควบคุม SQL ละเอียดยากกว่า
- Abstraction อาจทำให้ debug ช้าถ้าไม่ดู SQL log

**กับดัก `FirstOrCreate` ที่พบบ่อย:**

```go
// ❌ ผิด — ใส่ ID ใน struct ก่อน Where ทำให้เงื่อนไขกลายเป็น email AND id
u := User{ID: uuid.NewString(), Email: email, ...}
db.Where(User{Email: email}).FirstOrCreate(&u) // รันซ้ำ → duplicate key

// ✅ ถูก — Where มีแค่คีย์ค้นหา, ค่าตอนสร้างใส่ Attrs
var u User
db.Where("email = ?", email).Attrs(User{ID: uuid.NewString(), Email: email, ...}).FirstOrCreate(&u)
```

ทดสอบกับ Postgres จริงได้ผ่าน [`scripts/pg-live-test/`](../scripts/pg-live-test/) (embedded Postgres ไม่ต้อง Docker)

### SQLx (thin layer บน database/sql)

ข้อดี:

- เขียน SQL ชัดเจน = predictable
- Performance และ explain plan ควบคุมง่าย
- Struct scan ด้วย tag `db:"column"`

ข้อเสีย:

- ต้องเขียน SQL / mapping เองมากขึ้น
- ไม่มี association อัตโนมัติ

| Use case                              | แนะนำ                     |
| ------------------------------------- | ------------------------- |
| CRUD มาตรฐาน, ทีมชอบ model            | GORM                      |
| Reporting, query ซับซ้อน, ทีมถนัด SQL | SQLx                      |
| project ใหญ่ระยะยาว                   | มักเริ่ม SQLx หรือ hybrid |

**Production tip:** แม้ใช้ GORM ก็ควรเปิด SQL log ใน staging และระวัง preload

---

## 4. Connection Pooling

ทั้ง GORM และ SQLx ใช้ `database/sql` pool ข้างใต้

```go
sqlDB.SetMaxOpenConns(25)     // connection พร้อมกันสูงสุด
sqlDB.SetMaxIdleConns(10)     // เก็บ idle ไว้ reuse
sqlDB.SetConnMaxLifetime(time.Hour)   // อายุ connection
sqlDB.SetConnMaxIdleTime(10 * time.Minute)
```

ตั้งค่าผิดอาการที่พบบ่อย:

- `MaxOpenConns` สูงเกิน → DB แน่น, latency พุ่ง
- Idle นานโดยไม่จำกัด → connection ค้างฝั่ง Postgres
- ไม่มี timeout ที่ context → request ค้างกิน connection

---

## 5. Database Migrations

**อย่าพึ่ง AutoMigrate เป็นเครื่องมือเดียวใน production**

แนวทางที่ถูกต้อง:

1. Migration เป็นไฟล์ versioned (`0001_create_users.sql`)
2. รันผ่านเครื่องมือเช่น `golang-migrate`, `goose`, หรือ Atlas
3. CI ตรวจว่า migrate ขึ้นได้จากศูนย์
4. Rollback strategy ชัดเจน (อย่างน้อย forward-fix)

ตัวอย่างแนว SQL:

```sql
-- 0001_create_users.up.sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now ()
);
```

AutoMigrate ของ GORM เหมาะกับ prototype / local เท่านั้น

---

## 6. CORS สำหรับ Frontend

Browser จะบล็อก cross-origin ถ้า API ไม่ส่ง header ที่ถูกต้อง

สิ่งที่ต้องกำหนดชัด:

| หัวข้อ              | คำแนะนำ                                           |
| ------------------- | ------------------------------------------------- |
| `Allow-Origin`      | ระบุ origin จริง อย่าใช้ `*` เมื่อส่ง credentials |
| `Allow-Credentials` | `true` เมื่อใช้ cookie                            |
| `Allow-Methods`     | จำกัดเท่าที่ใช้                                   |
| `Allow-Headers`     | รวม `Authorization`, `Content-Type`               |
| Preflight `OPTIONS` | Framework จัดการให้ถ้าตั้งค่าถูก                  |

```text
Frontend (Vite :5173) → API (:8080) ต้องตั้ง CORS origin = http://localhost:5173
```

---

## 7. Cookie Session vs JWT

|          | Cookie Session                    | JWT (Bearer)                          |
| -------- | --------------------------------- | ------------------------------------- |
| State    | Server เก็บ session store         | Client ถือ token (stateless)          |
| CSRF     | ต้องป้องกันเมื่อ cookie + browser | น้อยกว่าถ้าไม่เก็บใน cookie           |
| Revoke   | ลบ session ได้ทันที               | ต้อง blacklist / short TTL + refresh  |
| เหมาะกับ | Web app same-site / BFF           | Mobile, SPA หลาย domain, microservice |

### Best practice ผสมที่นิยม

- Access token JWT อายุสั้น (5–15 นาที)
- Refresh token ใน **HttpOnly Secure SameSite** cookie
- หรือ session cookie ผ่าน BFF แล้ว frontend ไม่แตะ token ตรง ๆ

```go
// Cookie flags ที่ควรคิดทุกครั้ง
cookie.HttpOnly = true
cookie.Secure = true   // production HTTPS
cookie.SameSite = http.SameSiteLaxMode
cookie.Path = "/"
```

---

## 8. File Uploader Endpoint

จุดเสี่ยงด้านความปลอดภัยสูง — ต้องจำกัดทุกชั้น

Checklist:

1. จำกัดขนาด body (`MaxBytesReader` / framework body limit)
2. ตรวจ MIME จริง ไม่เชื่อนามสกุลอย่างเดียว
3. Generate ชื่อไฟล์ใหม่ (อย่าใช้ชื่อจาก user ตรง ๆ)
4. เก็บนอก web root หรือใช้ object storage (S3)
5. สแกน/จำกัดประเภท: รูป, PDF ฯลฯ ตามธุรกิจ
6. คืน metadata (id, url, size) ไม่คืน path ภายใน server

```go
r.Body = http.MaxBytesReader(w, r.Body, 8<<20) // 8MB
file, header, err := r.FormFile("file")
```

---

## 9. Best Practices สรุป

1. แยก **router / handler / service / repository** ตั้งแต่มือใหม่
2. ใส่ request timeout ด้วย context ทุก query
3. Hash รหัสผ่านด้วย **bcrypt** หรือ **argon2** — ห้ามเก็บ plain text
4. อย่า log token, password, หรือไฟล์เนื้อหา
5. ใช้ env/config สำหรับ DSN และ JWT secret
6. เขียน migration ก่อน feature ที่แตะ schema
7. CORS ใน production ต้อง allowlist origin

---

## ไฟล์ตัวอย่าง

| folder                                                             | เนื้อหา                      |
| ------------------------------------------------------------------ | ---------------------------- |
| [`examples/01-fiber/`](./examples/01-fiber/)                       | Fiber routing + middleware   |
| [`examples/02-gin/`](./examples/02-gin/)                           | Gin routing + middleware     |
| [`examples/03-gorm/`](./examples/03-gorm/)                         | GORM + Postgres pool         |
| [`examples/04-sqlx/`](./examples/04-sqlx/)                         | SQLx + manual SQL            |
| [`examples/05-auth-cors-upload/`](./examples/05-auth-cors-upload/) | CORS + JWT + Cookie + Upload |

## Lab

[`LAB.md`](./LAB.md) — สร้าง Notes API ครบเครื่อง
เฉลยอยู่ที่ [`lab/solution/`](./lab/solution/)

**ก่อนหน้า ← [`../01-beginner/`](../01-beginner/)** · **ถัดไป → [`../03-expert/`](../03-expert/)**

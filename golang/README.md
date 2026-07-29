📍 **Nav:** [`🏠 Dev Learning Courses Hub`](https://github.com/worapha05/dev-learning-courses-hub/blob/main/README.md) | [`📂 Backend Courses Index`](../README.md) | [`📝 Prompt File`](https://github.com/worapha05/ai-learning-prompts-hub/blob/main/course-generation/backend-courses/golang-prompt.md)

---

# Go Full-Stack Bootcamp — Zero to Expert

bootcamp เรียนรู้ Go (Golang) แบบครบวงจรสำหรับ **Modern Full-stack Developers**
จากพื้นฐานภาษา → สร้าง API ด้วย Framework จริง → Architecture ระดับ Production

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- เขียน Go ได้คล่อง โดยเข้าใจ pointer, error handling และ execution model
- ออกแบบ API ด้วย `net/http`, Fiber และ Gin
- เชื่อม PostgreSQL ด้วย GORM และ SQLx พร้อม connection pool และ migration
- ทำ Auth (JWT + Cookie Session), CORS และ File Upload
- ใช้ concurrency, context และ worker pool อย่างถูกต้อง
- จัดโครงสร้าง project แบบ Clean Architecture

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                                            | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | ----------------------------------------------------- | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | Syntax, Structs, Interfaces, JSON, `net/http`         | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | Fiber, Gin, GORM, SQLx, Auth, CORS, Upload            | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | Concurrency, Context, Worker Pool, Clean Architecture | 2–3 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย + Best Practices
2. **`examples/`** — โค้ดตัวอย่างที่รันได้จริง
3. **`LAB.md`** — โจทย์ปฏิบัติพร้อมเฉลยเต็ม

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐาน programming (ตัวแปร, function, loop)
- เคยพัฒนา Web/API มาบ้าง (Node, Python, PHP หรืออื่น ๆ ก็ได้)
- ติดตั้ง [Go 1.22+](https://go.dev/dl/)
- (ระดับ Intermediate+) ติดตั้ง Docker สำหรับ PostgreSQL

```bash
# ตรวจ version Go
go version

# รัน PostgreSQL แบบเร็ว (Intermediate+)
docker run --name go-bootcamp-pg \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=bootcamp \
  -p 5432:5432 -d postgres:16
```

---

## วิธีใช้ Bootcamp

1. อ่าน `README.md` ของระดับนั้นให้จบก่อน
2. เปิด folder `examples/` แล้วรันโค้ดทีละไฟล์
3. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลยใน `lab/solution/`
4. ไประดับถัดไปเมื่อทำ Lab ผ่านและเข้าใจเหตุผลของแต่ละ pattern

```bash
# ตัวอย่างการรัน Beginner
cd go-fullstack-bootcamp/01-beginner/examples/01-syntax
go run .

# ตัวอย่าง Lab Beginner
cd go-fullstack-bootcamp/01-beginner/lab/solution
go run .
```

---

## Learning Path ที่แนะนำ

```
Beginner: Core Language + net/http
 ↓
Intermediate: Frameworks + DB + Auth
 ↓
Expert: Concurrency + Clean Architecture
 ↓
project จริงของคุณเอง (Portfolio API)
```

---

## หลักการสำคัญที่หลักสูตรย้ำตลอด

| หลักการ                      | ความหมายใน Go                                        |
| ---------------------------- | ---------------------------------------------------- |
| Explicit is better           | Error เป็นค่าที่ต้องจัดการ ไม่ใช่ exception          |
| Composition over inheritance | ใช้ embedding + interface แทน class hierarchy        |
| Concurrency ≠ Parallelism    | Goroutine ถูก แต่ต้องออกแบบ synchronization          |
| Interface ที่ขอบเขต          | นิยาม interface ฝั่ง consumer ไม่ใช่ฝั่ง implementer |
| Context ทุกที่               | Timeout / cancel / deadline ผ่าน `context.Context`   |

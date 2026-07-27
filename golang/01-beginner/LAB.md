# Lab — Beginner: Task Board API (net/http)

## เป้าหมาย

สร้าง **Task Board API** ด้วย `net/http` อย่างเดียว (ห้ามใช้ Fiber/Gin)
ฝึก struct, interface, JSON และ explicit error handling

## โจทย์

สร้าง REST API ที่รองรับ:

| Method   | Path          | คำอธิบาย                       |
| -------- | ------------- | ------------------------------ |
| `GET`    | `/health`     | คืน `{"status":"ok"}`          |
| `GET`    | `/tasks`      | รายการ task ทั้งหมด            |
| `GET`    | `/tasks/{id}` | ดึง task ตาม id — ไม่เจอ = 404 |
| `POST`   | `/tasks`      | สร้าง task จาก JSON body       |
| `PATCH`  | `/tasks/{id}` | update `title` และ/หรือ `done` |
| `DELETE` | `/tasks/{id}` | ลบ task — ไม่เจอ = 404         |

### โครงข้อมูล Task

```json
{
  "id": "t-1",
  "title": "เรียน Go pointer",
  "done": false
}
```

### ข้อกำหนดบังคับ

1. มี interface `TaskRepository` แยกจาก HTTP handler
2. Implement ด้วย in-memory store ที่ปลอดภัยต่อ concurrent request (`sync.Mutex` หรือ `RWMutex`)
3. `POST /tasks` ต้อง validate: `title` ไม่ว่าง
4. Error response รูปแบบเดียวกัน: `{"error":"..."}`
5. ใช้ Go 1.22+ routing แบบ `METHOD /path/{param}`

### ตัวอย่าง Request

```bash
# สร้าง
curl -s -X POST http://localhost:8080/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"เขียน Lab Beginner"}'

# รายการ
curl -s http://localhost:8080/tasks

# update
curl -s -X PATCH http://localhost:8080/tasks/t-1 \
  -H 'Content-Type: application/json' \
  -d '{"done":true}'

# ลบ
curl -s -X DELETE http://localhost:8080/tasks/t-1
```

## เกณฑ์ผ่าน

- [ ] ทุก endpoint ทำงานตามตาราง
- [ ] Handler ไม่เก็บ `map` ตรง ๆ — เรียกผ่าน interface
- [ ] JSON encode/decode ถูกต้อง
- [ ] กรณี error คืน status ที่เหมาะสม (400/404)

## คำใบ้

- เก็บ sequence number สำหรับ generate id เช่น `t-1`, `t-2`
- `PATCH` ควรใช้ pointer field (`*bool`, `*string`) หรือ map บางส่วน เพื่อแยก “ไม่ได้ส่ง” กับ “ส่งค่า false”
- อย่าลืม `Content-Type: application/json`

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

```bash
cd lab/solution
go run .
```


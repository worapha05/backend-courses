# Lab — Expert: Async Excel Export Service (Clean Architecture)

## เป้าหมาย

สร้างระบบ **Export Job API** ที่:

1. รับคำขอ export ชุดข้อมูลขนาดใหญ่
2. ประมวลผลแบบ async ด้วย **Worker Pool**
3. รองรับ **timeout/cancel ผ่าน context**
4. จัดโครงสร้างแบบ **Clean Architecture**

จำลอง “generate Excel” ด้วยการ sleep + สร้างไฟล์ข้อความ `.csv` ก็เพียงพอสำหรับ Lab

---

## โจทย์

### Domain

`ExportJob` มีสถานะ:

- `pending` → `running` → `completed` | `failed` | `cancelled`

Field อย่างน้อย:

```text
id, status, rows_requested, rows_done, output_path, error, created_at, finished_at
```

### Endpoints

| Method | Path                   | คำอธิบาย                                                      |
| ------ | ---------------------- | ------------------------------------------------------------- |
| `POST` | `/exports`             | body: `{"rows":1000}` สร้าง job แล้วคิวงานทันที คืน 202 + job |
| `GET`  | `/exports/{id}`        | สถานะ job                                                     |
| `POST` | `/exports/{id}/cancel` | ยกเลิก job (ถ้ายังไม่เสร็จ)                                   |

### ข้อกำหนดบังคับ

1. folder แยก `domain / usecase / adapter / worker`
2. Worker pool จำกัดจำนวน worker (เช่น 4)
3. การ “generate” แต่ละแถวต้องเช็ค `ctx.Done()` เป็นระยะ
4. เมื่อ cancel — สถานะเป็น `cancelled`
5. เมื่อครบแถว — เขียนไฟล์ `exports/{id}.csv` และสถานะ `completed`
6. HTTP handler ห้ามเรียก worker ตรง ๆ — ผ่าน use case / port

### คำใบ้สถาปัตย์

```text
HTTP → CreateExportUseCase → ExportRepository + JobQueue (port)
          ↑
        Worker Pool (infra)
```

---

## ทดสอบ

```bash
cd lab/solution
go run ./cmd/exportapi

# สร้างงานใหญ่
curl -s -X POST localhost:8092/exports -H 'Content-Type: application/json' -d '{"rows":500}'

# ดูสถานะ
curl -s localhost:8092/exports/<ID>

# ยกเลิก
curl -s -X POST localhost:8092/exports/<ID>/cancel
```

---

## เกณฑ์ผ่าน

- [ ] สร้าง job แล้วสถานะเปลี่ยน pending → running → completed
- [ ] Cancel ระหว่างทางได้
- [ ] เปิดงานพร้อมกันหลาย job โดยไม่ระเบิด goroutine (worker จำกัด)
- [ ] Domain ไม่ import `net/http`

## เฉลย

[`lab/solution/`](./lab/solution/)

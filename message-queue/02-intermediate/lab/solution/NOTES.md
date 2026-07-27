# NOTES — ShopFlow (Intermediate Lab)

## Alert เมื่อคิวค้าง

แนวทางขั้นต่ำสำหรับ lab / staging:

- Metric: `rabbitmq_queue_messages` หรือ depth จาก Management API สำหรับ `shopflow.orders`
- Alert เมื่อ `depth > 100` นานกว่า 5 นาที **และ** มี consumer อยู่
- แยก alert เมื่อ `consumers == 0` แต่ depth > 0 (worker ตายทั้งก้อน)
- Alert เมื่อ `shopflow.orders.dlq` depth > 0 (ต้องมีคนเปิดดู poison)

## คำถามคิด

### 1. ทำไม poison ต้องเข้า DLQ?

`nack(requeue=true)` จะทำให้ message พิษวนไม่จบ กิน CPU, บล็อก prefetch slot และอาจทำให้ worker crash loop
DLQ เก็บไว้วิเคราะห์ แก้ข้อมูล หรือ replay ทีหลังอย่างควบคุม

### 2. TTL retry vs nack requeue?

|                | TTL retry queue             | nack requeue                  |
| -------------- | --------------------------- | ----------------------------- |
| หน่วงเวลา      | ได้ (backoff ง่าย)          | กลับทันที → อาจยิงถี่         |
| ควบคุม attempt | ใส่ใน payload/header ได้ชัด | ต้องนับเอง และเสี่ยง hot-loop |
| ช่วงพักระบบ    | ให้ระบบหายก่อนลองใหม่       | กดระบบต่อทันที                |

### 3. Consumer 5 ตัวบน 3 partitions?

มีอย่างมาก 3 ตัวที่ได้ partition — อีก 2 ตัว **idle** ในกลุ่ม
เพิ่ม consumer เกิน partitions ไม่เพิ่ม parallelism

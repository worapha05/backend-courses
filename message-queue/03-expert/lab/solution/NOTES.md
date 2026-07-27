# NOTES — AetherNotify (Expert Lab)

## 1. Idempotent producer ช่วย / ไม่ช่วยอะไร?

**ช่วย:** กัน duplicate records ใน Kafka log ที่เกิดจาก producer retry (network timeout แล้วส่งซ้ำ)

**ไม่ช่วย:**

- Consumer อ่านซ้ำแล้วเรียก SMTP สองครั้ง
- Dispatcher เขียนลง RabbitMQ สองครั้งหลัง rebalance
  → ต้องมี idempotency ที่ application (`commandId` processed set / DB unique)

## 2. ทำไม key = userId?

เหตุการณ์แจ้งเตือนของผู้ใช้คนเดียวกันควรเรียงใน partition เดียว
เช่น OTP แล้วตามด้วย "login success" — ลดโอกาสส่งสลับลำดับต่อผู้ใช้
และช่วยให้ scale ตามจำนวนผู้ใช้กระจายไปหลาย partitions

## 3. Duplicate job จาก Kafka → Rabbit ได้อย่างไร?

At-least-once: dispatcher ประมวลผล (enqueue Rabbit) สำเร็จ แต่ crash ก่อน commit Kafka offset
→ หลัง rebalance จะ enqueue ซ้ำ

แก้ที่ชั้น worker ด้วย **idempotency บน `commandId`** (และ/หรือ transactional outbox ขั้นสูงกว่านี้)

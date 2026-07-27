# Lab ระดับ Beginner — ระบบแจ้งเตือนออเดอร์ "OrderPing"

## เป้าหมาย

สร้างระบบรับส่งข้อความสำหรับร้านค้าออนไลน์จำลอง **OrderPing**:

- ใช้ **RabbitMQ Topic Exchange** แยก event ตามประเภทและภูมิภาค
- ใช้ **manual ACK** เมื่อส่งอีเมลจำลองสำเร็จ
- ใช้ **Kafka** เก็บ event log ของออเดอร์ให้ทีม analytics อ่านได้

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## กรณีศึกษา

startup **OrderPing** รับออเดอร์จากเว็บ
ตอนนี้ API เรียกส่งอีเมลแบบ sync ทำให้ checkout ช้า และถ้า SMTP ล่มทั้ง request ล้ม

CTO ต้องการ:

1. API แค่ **publish event** แล้วตอบลูกค้าเร็ว ๆ
2. Worker ส่งอีเมล / SMS แยกคิว
3. มี **audit stream** บน Kafka ให้ทีม data วิเคราะห์ได้โดยไม่รบกวน worker

---

## โจทย์

### ส่วนที่ 1 — RabbitMQ Topology

สร้าง:

| ชื่อ                        | ชนิด                             |
| --------------------------- | -------------------------------- |
| Exchange `orderping.events` | **topic**, durable               |
| Queue `orderping.email`     | durable — bind `order.created.*` |
| Queue `orderping.sms`       | durable — bind `order.shipped.*` |
| Queue `orderping.audit.rmq` | durable — bind `#`               |

Publisher ส่งอย่างน้อย 4 messages:

| routing key         | หมายเหตุ              |
| ------------------- | --------------------- |
| `order.created.th`  | ต้องถึง email + audit |
| `order.created.us`  | ต้องถึง email + audit |
| `order.shipped.th`  | ต้องถึง sms + audit   |
| `payment.failed.th` | ถึงแค่ audit          |

Payload อย่างน้อย:

```json
{
  "id": "evt-...",
  "type": "order.created",
  "version": 1,
  "data": { "orderId": "ORD-1001", "email": "user@example.com" }
}
```

### ส่วนที่ 2 — Manual ACK Email Worker

เขียน consumer ของ `orderping.email` ที่:

1. ตั้ง `prefetch(1)`
2. จำลองส่งอีเมลด้วย `console.log` หรือ sleep สั้น ๆ
3. **ACK** เมื่อสำเร็จ
4. ถ้า `orderId` ลงท้ายด้วย `-FAIL` ให้ **NACK ไม่ requeue** (จำลอง poison — ระดับถัดไปจะพาไป DLX)

ทดสอบด้วย message ปกติอย่างน้อย 2 ชิ้น และ (optional) ชิ้นที่ `-FAIL` หนึ่งชิ้น

### ส่วนที่ 3 — Kafka Order Log

1. สร้าง topic `orderping.orders` **3 partitions**
2. Produce event `order.created` อย่างน้อย 5 รายการ โดยใช้ **key = orderId**
3. Consumer group `orderping-analytics` อ่านและพิมพ์ `partition` + `offset` + `orderId`
4. อธิบายสั้น ๆ ใน `NOTES.md`: ทำไม key เดียวกันจึงอยู่ partition เดิม

### ส่วนที่ 4 — คำถามคิด (ตอบใน `NOTES.md`)

1. ทำไม OrderPing ถึงใช้ทั้ง RabbitMQ และ Kafka ไม่ใช้แค่อย่างใดอย่างหนึ่ง?
2. ถ้าใช้ Fanout แทน Topic สำหรับโจทย์นี้ ข้อเสียคืออะไร?
3. Auto-ack อันตรายอย่างไรกับ email worker?

---

## เกณฑ์ผ่าน

- [ ] Topology RabbitMQ ครบตามตาราง และ routing ถูกต้องตามที่ระบุ
- [ ] Email worker ใช้ manual ACK + prefetch
- [ ] Kafka topic มี messages และ consumer อ่านได้พร้อมแสดง partition/offset
- [ ] `NOTES.md` ตอบคำถามคิดครบ

---

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

```bash
node 01-beginner/lab/solution/orderping.js
```

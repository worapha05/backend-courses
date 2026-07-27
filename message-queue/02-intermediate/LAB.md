# Lab ระดับ Intermediate — ระบบประมวลผลออเดอร์ "ShopFlow"

## เป้าหมาย

สร้าง pipeline ประมวลผลออเดอร์ที่เชื่อถือได้สำหรับ **ShopFlow**:

- Work queue บน RabbitMQ พร้อม **DLX / DLQ**
- Retry ด้วย **TTL delay queue**
- ส่ง event สำเร็จเข้า **Kafka** ด้วย message key = `orderId`
- จัดการกรณี **คิวค้าง / poison message**

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## กรณีศึกษา

**ShopFlow** เป็น platform ขายของมือสอง
ช่วงแคมเปญ 11.11 ออเดอร์พุ่ง — worker ตัวเดียวไม่ทัน และมี message พิษที่ทำให้ process วน restart

อาการที่ทีมเจอ:

1. คิว `shopflow.orders` ยาวขึ้นเรื่อย ๆ (lag)
2. Message บางอันทำให้ JSON parse พัง — ถ้า requeue จะวนไม่จบ
3. ต้องการให้ทีม BI อ่านออเดอร์ที่สำเร็จจาก Kafka โดยไม่แย่งงานกับ worker

---

## โจทย์

### ส่วนที่ 1 — Topology RabbitMQ

สร้างให้ครบ:

| องค์ประกอบ                    | สเปก                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| Exchange `shopflow.dlx`       | direct, durable                                                                                      |
| Queue `shopflow.orders.dlq`   | durable, bind routing key `dlq`                                                                      |
| Queue `shopflow.orders`       | durable, `x-dead-letter-exchange=shopflow.dlx`, `x-dead-letter-routing-key=dlq`                      |
| Queue `shopflow.orders.retry` | durable, `x-message-ttl=3000`, DLX กลับไป `shopflow.orders` (default exchange + routing key ชื่อคิว) |

### ส่วนที่ 2 — Producer & Workers

1. Publish ออเดอร์อย่างน้อย **8 รายการ** เข้า `shopflow.orders`
2. มี worker **อย่างน้อย 2 ตัว** (process เดียวหรือแยกก็ได้) ด้วย `prefetch(1)`
3. กฎประมวลผล:

- ถ้า `payload` ไม่ใช่ JSON ถูกต้อง หรือมีฟิลด์ `poison: true` → **NACK ไม่ requeue** (ไป DLQ)
- ถ้า `shouldFailOnce: true` และยังไม่เคย retry → ส่งเข้า `shopflow.orders.retry` แล้ว ACK ออกจากคิวหลัก
- นอกนั้นประมวลผลสำเร็จ (sleep สั้น ๆ ได้) แล้ว ACK

4. เมื่อสำเร็จ ให้ publish ไป Kafka topic `shopflow.order-events` (3 partitions)
   key = `orderId`, value = `{ type: "order.completed", orderId, at }`

### ส่วนที่ 3 — สังเกตคิวค้าง

1. ชั่วคราว **หยุด consumer** แล้ว publish งานเพิ่ม 20 ชิ้น
2. ดูความยาวคิวใน Management UI (หรือ `queueCheck`)
3. เปิด consumer กลับ — งานต้องถูกกินจนหมด
4. จดใน `NOTES.md` ว่าจะตั้ง alert อย่างไร (เช่น depth > 100 นานกว่า 5 นาที)

### ส่วนที่ 4 — Kafka Consumer Group

สร้าง consumer group `shopflow-bi` อ่าน `shopflow.order-events` แล้วสรุปจำนวนออเดอร์ที่ completed

### ส่วนที่ 5 — คำถามคิด (`NOTES.md`)

1. ทำไม poison ต้องเข้า DLQ แทน requeue?
2. Retry ผ่าน TTL queue ต่างจาก `nack(requeue=true)` อย่างไร?
3. ถ้า Kafka consumer ในกลุ่ม BI มี 5 ตัว แต่ topic มี 3 partitions จะเกิดอะไรขึ้น?

---

## เกณฑ์ผ่าน

- [ ] DLX/DLQ/retry topology ทำงานจริง
- [ ] Poison ไป DLQ, transient failure ถูก retry แล้วสำเร็จ
- [ ] Kafka มี completed events ตาม orderId
- [ ] `NOTES.md` ครบ

---

## เฉลย

```bash
node 02-intermediate/lab/solution/shopflow.js
```

ดูรายละเอียดใน [`lab/solution/`](./lab/solution/)

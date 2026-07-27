# NOTES — OrderPing (Beginner Lab)

## ทำไม key เดียวกันอยู่ partition เดิม?

Kafka เลือก partition ด้วย `hash(key) % numPartitions` (หรือ sticky/default ถ้าไม่มี key)
ดังนั้น `orderId` เดิม → hash เดิม → partition เดิม → event ของออเดอร์นั้นเรียงลำดับต่อกันได้ภายใน partition

## คำถามคิด

### 1. ทำไมใช้ทั้ง RabbitMQ และ Kafka?

- **RabbitMQ**: งาน operational แบบ task — ส่งอีเมล/SMS ครั้งเดียว, routing ด้วย topic exchange, competing consumers
- **Kafka**: event log สำหรับ analytics / audit — เก็บได้นาน, หลายทีมอ่านคนละ consumer group, replay ได้

ใช้คนละเครื่องมือตามคำถาม "ใครทำงาน" vs "เกิดอะไรขึ้น"

### 2. Fanout แทน Topic?

Fanout ส่งทุก message ไปทุกคิวที่ bind — email worker จะได้ `order.shipped` และ `payment.failed` ด้วย
ต้อง filter ในแอปเอง หรือสร้าง exchange แยก ทำให้เสียความชัดของ taxonomy และโหลดเพิ่ม

### 3. Auto-ack อันตรายอย่างไร?

Broker ถือว่าส่งแล้ว = สำเร็จทันที
ถ้า worker ตายหลังรับแต่ก่อน SMTP สำเร็จ → **อีเมลไม่ถูกส่งและ message หาย** ไม่มี redelivery

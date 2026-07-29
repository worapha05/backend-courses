📍 **Nav:** [`🏠 Dev Learning Courses Hub`](https://github.com/worapha05/dev-learning-courses-hub/blob/main/README.md) | [`📂 Backend Courses Index`](../README.md) | [`📝 Prompt File`](https://github.com/worapha05/ai-learning-prompts-hub/blob/main/course-generation/backend-courses/message-queue-prompt.md)

---

# Messaging Queue Bootcamp — Zero to Expert

bootcamp เรียนรู้ **Messaging Queues และ Event Streaming** แบบครบวงจร
เน้น **Apache Kafka และ RabbitMQ**
ตั้งแต่ Foundations / Topologies → Reliability / Integration Patterns → Enterprise Scale / Resilience / Ops

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- อธิบายความต่างของ **Message Queue (RabbitMQ)** กับ **Event Streaming (Kafka)** และเลือกเครื่องมือให้เหมาะกับงาน
- ออกแบบ topology ของ RabbitMQ ด้วย **Exchange / Queue / Binding** และจัดการ **ACK/NACK**
- ใช้งาน Kafka ระดับพื้นฐานถึงขั้นสูง: **Topics, Partitions, Consumer Groups, Offsets, Keys**
- สร้างระบบที่เชื่อถือได้ด้วย **DLX, TTL, Work Queues, Idempotent Producers** และเข้าใจ delivery semantics
- รับมือโหลดสูงและ failure ด้วย **Partitioning, Quorum Queues, Retry/Backoff, Circuit Breaker, Backpressure**
- ออกแบบการ monitor (lag) และ pipeline **CDC** สำหรับ update ฐานข้อมูลแบบ zero-downtime

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                                                         | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------ | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | Messaging concepts, RabbitMQ exchanges, ACK, Kafka basics          | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | DLX/TTL, Work Queues, Kafka offsets/keys/rebalance, async pipeline | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | Delivery semantics, scaling, resilience, monitoring & CDC          | 2–4 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย เน้น Distributed Messaging และสถาปัตยกรรม
2. **`examples/`** — โค้ด JavaScript (Node.js) / Python ที่รันได้จริงกับ RabbitMQ + Kafka
3. **`LAB.md`** — โจทย์กรณีศึกษาจริงพร้อมเฉลยเต็มใน `lab/solution/`

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐาน JavaScript (ES modules, async/await) หรือ Python 3.11+
- ความเข้าใจ HTTP / JSON และแนวคิด asynchronous programming
- ติดตั้ง [Docker](https://www.docker.com/) และ [Node.js 20+](https://nodejs.org/)

```bash
docker --version
docker compose version
node -v # ควรเป็น v20.x ขึ้นไป
```

---

## วิธีใช้ Bootcamp

1. สตาร์ท RabbitMQ + Kafka ด้วย Docker Compose จาก root ของ bootcamp
2. อ่าน `README.md` ของระดับนั้นให้จบ — โฟกัสที่ **ทำไมออกแบบ messaging แบบนี้**
3. รันตัวอย่างใน `examples/` ตามลำดับ
4. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลย
5. ไประดับถัดไปเมื่ออธิบาย trade-off ของการออกแบบได้

```bash
cd messaging-queue-bootcamp
docker compose up -d

# ติดตั้ง dependencies ระดับ root (ใช้ร่วมทุก examples)
npm install

# Beginner — RabbitMQ Direct exchange
node 01-beginner/examples/02-rabbitmq-exchanges/direct.js

# Beginner — Kafka produce / consume
node 01-beginner/examples/04-kafka-basics/produce-consume.js
```

| บริการ                 | Host Port | Credentials / Notes               |
| ---------------------- | --------- | --------------------------------- |
| RabbitMQ AMQP          | `5672`    | user `bootcamp` / pass `bootcamp` |
| RabbitMQ Management UI | `15672`   | เปิด http://localhost:15672       |
| Kafka (KRaft)          | `9092`    | PLAINTEXT — lab local เท่านั้น    |

Connection strings:

```text
amqp://bootcamp:bootcamp@localhost:5672
localhost:9092
```

---

## Learning Path ที่แนะนำ

```
Beginner: Queue vs Stream + RabbitMQ Exchanges + ACK + Kafka Topics/Partitions
 ↓
Intermediate: DLX/TTL/Work Queues + Offsets/Keys/Rebalance + Async Task Pipeline
 ↓
Expert: Exactly-Once / Idempotency + Scale + Resilience + Ops/CDC
 ↓
project จริงของคุณเอง (Order Processing / Notification Hub / Event-Driven Microservice)
```

---

## เมื่อไหร่ใช้ RabbitMQ vs Kafka?

| คำถาม                                                                         | แนวทาง                               |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| ต้องการ routing ซับซ้อน (topic/headers) และ message หายไปหลัง consume?        | RabbitMQ                             |
| ต้องการ replay ประวัติ event, high throughput, หลาย consumer อ่านคนละ offset? | Kafka                                |
| Task queue / RPC / work distribution แบบ classic?                             | RabbitMQ (หรือ SQS)                  |
| Event log / CDC / analytics stream?                                           | Kafka                                |
| ทีมเล็ก ต้องการ ops ง่าย + UI จัดการคิว?                                      | RabbitMQ Management มักเริ่มง่ายกว่า |

> **กฎทอง:** อย่าเลือก Kafka เพราะ "ทุกคนใช้" — เลือกเมื่อต้องการ **log ของ events ที่เก็บได้นาน + scale ด้วย partition** จริง ๆ

---

## Best Practices ข้ามระดับ (สรุปเร็ว)

1. **กำหนด delivery semantic ให้ชัด** — at-most-once / at-least-once / exactly-once (หรือ effectively-once ด้วย idempotency)
2. **อย่าทำธุรกิจ logic ใน broker** — broker ขนส่ง; application เป็นเจ้าของความหมายของ message
3. **ออกแบบ schema / contract ของ payload** ตั้งแต่แรก (version field, idempotency key)
4. **Monitor lag และ DLQ** ก่อนที่ลูกค้าจะบ่น
5. **ทดสอบ failure path** — broker restart, slow consumer, poison message — ไม่ใช่แค่ happy path

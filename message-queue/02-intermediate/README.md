# Level 2 — Intermediate: Advanced Integration Patterns & Reliability

เป้าหมายระดับนี้: ทำให้ระบบ messaging **ทนต่อ failure** และออกแบบ **async task pipeline** ที่ใช้งานจริงได้
คุณจะเชื่อม RabbitMQ reliability patterns กับ Kafka offset/key/rebalance และประกอบเป็น pipeline เดียว

---

## สารบัญ

1. [Dead Letter Exchange (DLX) และ Message TTL](#1-dead-letter-exchange-dlx-และ-message-ttl)
2. [Work Queues — Competing Consumers](#2-work-queues--competing-consumers)
3. [Kafka Retention และ Offset Management](#3-kafka-retention-และ-offset-management)
4. [Message Keys และการเรียงลำดับ](#4-message-keys-และการเรียงลำดับ)
5. [Consumer Rebalancing](#5-consumer-rebalancing)
6. [Application Integration — Async Task Pipeline](#6-application-integration--async-task-pipeline)
7. [Best Practices สรุป](#7-best-practices-สรุป)

---

## 1. Dead Letter Exchange (DLX) และ Message TTL

### ปัญหาที่ DLX แก้

เมื่อ consumer **NACK ไม่ requeue**, message หมดอายุ (TTL), หรือคิวเต็ม (overflow)
ถ้าไม่มีที่ไป → message หายเงียบ ๆ
**Dead Letter Exchange** คือทางออกมาตรฐาน: ส่ง "ศพ" ไปคิววิเคราะห์ / retry ทีหลัง

```
Main Queue (x-dead-letter-exchange = dlx)
 │
 ├─ ACK สำเร็จ → ลบจากคิว
 │
 └─ reject / TTL / maxlen ──▶ DLX ──▶ dead_letter_queue
```

### การตั้งค่าสำคัญ (queue arguments)

| Argument                    | ความหมาย                                                   |
| --------------------------- | ---------------------------------------------------------- |
| `x-dead-letter-exchange`    | exchange ที่รับ dead letters                               |
| `x-dead-letter-routing-key` | (optional) เปลี่ยน routing key ตอน dead-letter             |
| `x-message-ttl`             | อายุ message ในคิวนี้ (ms)                                 |
| `x-expires`                 | อายุของคิวเองถ้าไม่มี consumer                             |
| `x-max-length`              | จำกัดความยาวคิว — ส่วนเกิน dead-letter หรือ drop ตามนโยบาย |

### Message TTL

ใช้เมื่อ:

- ข้อความแจ้งเตือนหมดความหมายหลัง N นาที
- สร้าง **delay / retry queue** (TTL สั้น → หมดอายุ → กลับเข้า main ผ่าน DLX)

> ระวัง: TTL ต่อ message กับ TTL ต่อคิวมีพฤติกรรมต่างกันเล็กน้อย — ใน production ทดสอบกับ version broker ของคุณ

ดูตัวอย่าง: [`examples/01-rabbitmq-dlx-ttl/`](./examples/01-rabbitmq-dlx-ttl/)

---

## 2. Work Queues — Competing Consumers

**Work Queue** = คิวเดียว มี worker หลายตัว **แข่งกันกิน** งาน
เหมาะกับ: resize รูป, สร้าง PDF, ส่งอีเมลจำนวนมาก, ประมวลผลออเดอร์

```
Producer ──▶ jobs_queue ──▶ Worker-1
      ├──▶ Worker-2
      └──▶ Worker-3
```

### เทคนิคที่ต้องมี

1. **`prefetch(1)`** (หรือค่าต่ำ) — กระจายงานยุติธรรม ไม่ให้ worker เร็วกว่ารับงานกองไว้
2. **Manual ACK** — งานเสร็จจริงก่อน ack
3. **Idempotent workers** — เพราะ redelivery เกิดได้หลัง crash
4. **Durable queue + persistent messages** สำหรับงานที่สูญเสียไม่ได้

### Round-robin vs Fair dispatch

- ถ้า auto-ack / prefetch สูง → worker แรงอาจถูกป้อนงานล่วงหน้าเยอะ (ไม่ fair)
- Fair dispatch ≈ prefetch ต่ำ + ack หลังจบงาน

ดูตัวอย่าง: [`examples/02-rabbitmq-work-queues/`](./examples/02-rabbitmq-work-queues/)

---

## 3. Kafka Retention และ Offset Management

### Retention

Kafka เก็บ record ตามนโยบาย ไม่ตาม "มีคนอ่านแล้วหรือยัง"

| นโยบาย     | ตัวอย่าง                 | ใช้เมื่อ                                  |
| ---------- | ------------------------ | ----------------------------------------- |
| Time-based | `retention.ms=7d`        | log ทั่วไป                                |
| Size-based | `retention.bytes=...`    | จำกัดดิสก์                                |
| Compact    | `cleanup.policy=compact` | changelog / ที่ต้องการแค่ค่าล่าสุดต่อ key |

**Compaction** สำคัญกับ CDC และ state: เก็บ latest value ต่อ key ลดขนาดโดยไม่เสีย snapshot ล่าสุด

### Offset commit

| โหมด                         | พฤติกรรม                 | ความเสี่ยง                                          |
| ---------------------------- | ------------------------ | --------------------------------------------------- |
| Auto-commit                  | commit เป็นระยะตาม timer | อาจ commit **ก่อน** ประมวลผลจบ → ข้ามงานเมื่อ crash |
| Manual commit (หลังประมวลผล) | คุณควบคุม                | crash ก่อน commit → **ประมวลผลซ้ำ** (at-least-once) |

```
อ่าน message → ประมวลผล (เขียน DB) → commit offset
     ↑
   ถ้ากลับด้าน = at-most-once (อาจเสียงาน)
```

ใน KafkaJS: ปิด `autoCommit` แล้วเรียก `resolveOffset` + `commitOffsetsIfNecessary` หรือใช้ `eachMessage` อย่างระวังตามเอกสาร version ที่ใช้อยู่

แนวทางที่นิยมในระบบจริง: **at-least-once + idempotent consumer**

ดูตัวอย่าง: [`examples/03-kafka-offsets-keys/`](./examples/03-kafka-offsets-keys/)

---

## 4. Message Keys และการเรียงลำดับ

### ทำไมต้องมี Key?

```
key = userId | orderId | accountId
→ hash(key) % partitions
→ event ที่เกี่ยวข้องกันอยู่ partition เดียวกัน
→ เรียงลำดับภายใน key นั้นได้
```

| สถานการณ์                     | Key ที่แนะนำ                          |
| ----------------------------- | ------------------------------------- |
| ออเดอร์เปลี่ยนสถานะ           | `orderId`                             |
| ยอดเงินบัญชี                  | `accountId`                           |
| ไม่สนใจลำดับ / max throughput | ไม่ใส่ key (หรือ sticky partitioning) |

### ข้อจำกัดที่ต้องจำ

- **ไม่มี global ordering** ข้ามทั้ง topic
- เปลี่ยนจำนวน partitions → mapping ของ key เปลี่ยน (ลำดับข้ามช่วงเวลาอาจพัง) — วางแผน partition count ตั้งแต่ต้น

---

## 5. Consumer Rebalancing

เมื่อสมาชิกใน consumer group เปลี่ยน (join / leave / crash / session timeout)
Kafka จะ **rebalance**: จัด partition ใหม่ให้ consumer ที่เหลือ

```
ก่อน: C1→[P0,P1] C2→[P2]
C2 ตาย
หลัง: C1→[P0,P1,P2] (ช่วง rebalance อาจ stop-the-world สั้น ๆ)
```

### ผลกระทบ

- ระหว่าง rebalance consumer อาจ **หยุดประมวลผลชั่วคราว** (ขึ้นกับ protocol)
- ถ้าประมวลผลนานเกิน `max.poll.interval.ms` → ถูกดีดออกจากกลุ่ม → rebalance วน

### แนวทางลดความเจ็บปวด

1. ประมวลผลให้จบเร็ว หรือแยก heavy work ออกจาก poll loop
2. ใช้ cooperative sticky assignor เมื่อรองรับ (ลดการย้าย partition ไม่จำเป็น)
3. อย่ามี consumer เกินจำนวน partitions
4. Monitor rebalance rate — สัญญาณของ instability

---

## 6. Application Integration — Async Task Pipeline

รูปแบบ classic ของผลิตภัณฑ์จริง:

```
Frontend / Client
 │ HTTP
 ▼
API Gateway / BFF ──publish──▶ Broker (RabbitMQ หรือ Kafka)
 │ 202 Accepted      │
 ▼         ▼
 ตอบผู้ใช้ทันที     Background Workers
           │
           ├─ update DB
           ├─ call email/SMS
           └─ emit next event
```

### หลักออกแบบ

1. **API ไม่ทำงานหนัก** — รับคำสั่ง, validate, persist outbox (ถ้าต้องการ), publish, ตอบ 202
2. **Contract ของ message ชัด** — version, idempotency key, correlation id
3. **Worker เป็น idempotent** — DB unique constraint / processed_events table
4. **Observability** — trace id จาก HTTP → message headers → worker logs
5. **Failure path** — DLX / retry topic / alert เมื่อ DLQ มีของ

### Outbox Pattern (แนะนำเมื่อต้องการความเชื่อถือสูง)

```
Transaction เดียว:
 1) เขียน business row (orders)
 2) เขียน outbox row (events ที่จะ publish)

Relay process อ่าน outbox → publish ไป broker → mark published
```

หลีกเลี่ยงปัญหา "เขียน DB สำเร็จแต่ publish ไม่ถึง" หรือกลับกัน

ดูตัวอย่าง: [`examples/04-async-task-pipeline/`](./examples/04-async-task-pipeline/)

---

## 7. Best Practices สรุป

1. **ทุกคิวงานสำคัญควรมี DLQ/DLX** และมีคนดู (alert)
2. **TTL ต้องมีความหมายทางธุรกิจ** ไม่ใส่เล่น ๆ
3. **Work queue = prefetch ต่ำ + manual ack + idempotent**
4. **Commit Kafka offset หลัง side effect สำเร็จ** (หรือใช้ transactional patterns ในระดับ Expert)
5. **เลือก message key ตามขอบเขตที่ต้องรักษาลำดับ**
6. **ออกแบบ pipeline ให้ API เบา และ worker ทน redelivery**
7. **วัด lag / ความยาวคิว / อัตรา DLQ** เป็น SLO ไม่ใช่แค่ CPU

---

## ลำดับการรันตัวอย่าง

```bash
docker compose up -d
npm install

node 02-intermediate/examples/01-rabbitmq-dlx-ttl/dlx-demo.js
node 02-intermediate/examples/02-rabbitmq-work-queues/work-queue.js
node 02-intermediate/examples/03-kafka-offsets-keys/keys-offsets.js
node 02-intermediate/examples/04-async-task-pipeline/pipeline.js
```

เมื่อพร้อมแล้ว ไปทำ Lab: [`LAB.md`](./LAB.md)

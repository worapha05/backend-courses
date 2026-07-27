# Level 3 — Expert: Enterprise Scale, High Availability & Resilience

เป้าหมายระดับนี้: ออกแบบระบบ messaging ระดับ production ที่ **ไม่สูญเสียข้อมูลโดยไม่ตั้งใจ**, **สเกลตามโหลด**, และ **ไม่พังเมื่อเจอ failure / โหลดกระชาก**

---

## สารบัญ

1. [Guaranteed Delivery และ Processing Semantics](#1-guaranteed-delivery-และ-processing-semantics)
2. [Idempotent Producers และ Exactly-Once](#2-idempotent-producers-และ-exactly-once)
3. [High Throughput — Partitioning และ Quorum Queues](#3-high-throughput--partitioning-และ-quorum-queues)
4. [Resilience — Poison Pills, Retry Backoff, Circuit Breaker, Backpressure](#4-resilience--poison-pills-retry-backoff-circuit-breaker-backpressure)
5. [Production Operations — Monitoring และ Lag](#5-production-operations--monitoring-และ-lag)
6. [CDC และ Zero-Downtime Data Changes](#6-cdc-และ-zero-downtime-data-changes)
7. [Best Practices สรุป](#7-best-practices-สรุป)

---

## 1. Guaranteed Delivery และ Processing Semantics

| Semantic          | ความหมาย                                       | ได้มาอย่างไร                                | แลกกับอะไร            |
| ----------------- | ---------------------------------------------- | ------------------------------------------- | --------------------- |
| **At-most-once**  | ส่ง/ประมวลผล ≤ 1 ครั้ง อาจหาย                  | fire-and-forget, auto-ack ก่อนทำ            | สูญเสียข้อมูลได้      |
| **At-least-once** | ≥ 1 ครั้ง ไม่หาย (ถ้า infra ถูกต้อง) แต่ซ้ำได้ | persist + ack หลังทำ + retry                | ต้อง idempotent       |
| **Exactly-once**  | ผลลัพธ์ทางธุรกิจเกิดครั้งเดียว                 | EOS ใน Kafka หรือ dedupe/idempotency ที่แอป | ซับซ้อน / จำกัดขอบเขต |

> ในระบบกระจายจริง "exactly-once end-to-end ทั่วทั้งโลก" หายาก
> ที่ทำได้จริงส่วนใหญ่คือ **effectively-once**: at-least-once + **idempotent handler**

```
Producer confirm/idempotent write
  ↓
Broker durability (replication / quorum)
  ↓
Consumer at-least-once + dedupe store
  ↓
Effectively-once business outcome
```

---

## 2. Idempotent Producers และ Exactly-Once

### Kafka Idempotent Producer

เปิด `enable.idempotence=true` (และ acks=all, retries พอ)
Broker ตรวจ producer PID + sequence → **ไม่เขียน duplicate จาก retry ของ producer**

ยัง **ไม่ครอบคลุม** consumer side effects (เขียน DB สองครั้งยังเกิดได้ถ้า consume ซ้ำ)

### Kafka Transactions (EOS ในขอบเขต Kafka)

- `sendOffsetsToTransaction` คู่กับ produce ไป output topic
- ใช้เมื่อ pipeline เป็น Kafka → process → Kafka
- เมื่อออกนอก Kafka (DB, HTTP) ต้องมี **transactional outbox / idempotency table** เพิ่ม

### Idempotency ที่ Application

```sql
CREATE TABLE processed_messages (
  message_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL
);
```

ก่อนทำ side effect: ถ้า `message_id` มีแล้ว → skip + ack/commit
หรือใช้ **natural unique key** ของธุรกิจ (`orderId` + `eventType`)

ดูตัวอย่าง: [`examples/01-delivery-semantics/`](./examples/01-delivery-semantics/)

---

## 3. High Throughput — Partitioning และ Quorum Queues

### Kafka Partitioning Strategy

| เป้าหมาย             | แนวทาง                                                      |
| -------------------- | ----------------------------------------------------------- |
| Max throughput       | เพิ่ม partitions + consumers ให้สมดุล                       |
| รักษาลำดับต่อ entity | key = entity id                                             |
| ลด hot partition     | หลีกเลี่ยง key ที่ skew มาก (เช่น `status=ACTIVE` เป็น key) |
| Disk / retention     | แยก topic ตาม SLA ความร้อนของข้อมูล                         |

สูตรหยาบ:
`partitions ≈ target_throughput / throughput_per_partition`
แล้วปัดขึ้นตามจำนวน consumer ที่จะรันพร้อมกัน

### RabbitMQ Quorum Queues

- replicating queue แบบ Raft — ทน broker สูงกว่า classic mirrored แบบเก่า
- เหมาะกับงานที่ต้องการ **ความทนทานของคิว** ใน cluster
- Trade-off: latency / throughput ต่ำกว่า classic queue บางกรณี

ใน lab เดี่ยวโหนด เราตั้ง quorum เพื่อเรียนรู้ API:

```js
await ch.assertQueue('orders.qq', {
  durable: true,
  arguments: { 'x-queue-type': 'quorum' },
});
```

ดูตัวอย่าง: [`examples/02-scaling-quorum/`](./examples/02-scaling-quorum/)

---

## 4. Resilience — Poison Pills, Retry Backoff, Circuit Breaker, Backpressure

### Poison Pill

Message ที่ **ประมวลผลแล้วล้มเหลวถาวร** ทุกครั้ง (schema ผิด, ข้อมูล corrupt, bug logic)

ทางแก้: attempt counter → เกิน threshold → **DLQ** + alert + ไม่ requeue

### Exponential Backoff + Retry Queues

```
attempt 1 → fail → wait 1s
attempt 2 → fail → wait 2s
attempt 3 → fail → wait 4s
attempt N → DLQ
```

บน RabbitMQ: หลาย delay queues คนละ TTL หรือ header + scheduler
บน Kafka: retry topic คนละชื่อ / ใช้บรรทัดเวลาใน payload

### Circuit Breaker

เมื่อ dependency ภายนอก (SMTP, payment API) พัง:

```
Closed ──failures──▶ Open (reject เร็ว / ส่งไป retry)
 ▲      │
 └──── success ◀── Half-open (ลองเป็นระยะ)
```

อย่าให้ worker ทุกตัวยิง dependency ที่ตายอยู่แล้วจน thread pool หมด

### Backpressure

ป้องกันไม่ให้ consumer รับงานเร็วเกินกว่าทำได้:

| ชั้น     | เทคนิค                                                  |
| -------- | ------------------------------------------------------- |
| RabbitMQ | `prefetch` ต่ำ                                          |
| Kafka    | จำกัด `max.poll.records`, บล็อก poll จนกว่างานชุดก่อนจบ |
| แอป      | queue ภายในมี bound, ไม่ unbounded buffer               |
| ระบบ     | scale workers, หรือ shed load ที่ producer              |

ดูตัวอย่าง: [`examples/03-resilience-patterns/`](./examples/03-resilience-patterns/)

---

## 5. Production Operations — Monitoring และ Lag

### สิ่งที่ต้องวัด

| สัญญาณ           | RabbitMQ                | Kafka                            |
| ---------------- | ----------------------- | -------------------------------- |
| ความลึกคิว / lag | queue depth, unacked    | consumer group lag               |
| Throughput       | publish/deliver rate    | messages in/out per topic        |
| Error            | DLQ depth               | failed processing rate           |
| Broker health    | node memory, disk alarm | under-replicated partitions, ISR |

### Lag Tracking

- **Kafka**: Burrow, Kafka Exporter + Prometheus, Confluent lag metrics
- สูตรคิด: `lag = log_end_offset - committed_offset` ต่อ partition แล้วรวม

> Lag ≠ latency เสมอไป — lag สูงแต่กำลังตามทันอาจโอเคชั่วคราว
> Lag สูงขึ้นเรื่อย ๆ = consumer ตามไม่ทัน → scale หรือ optimize

### Runbook ขั้นต่ำ

1. Alert: lag > SLO นาน X นาที
2. ตรวจ: consumer ตาย? rebalance วน? dependency ช้า? poison ใน DLQ?
3. Mitigation: scale consumer, rewind อย่างมีแผน, pause producer ถ้าจำเป็น

ดูตัวอย่าง: [`examples/04-ops-cdc/`](./examples/04-ops-cdc/)

---

## 6. CDC และ Zero-Downtime Data Changes

**Change Data Capture (CDC)** จับการเปลี่ยนแปลงของ database (insert/update/delete) แล้วส่งเป็น event stream (มักผ่าน Kafka + Debezium)

```
PostgreSQL WAL ──▶ Debezium ──▶ Kafka topic
         │
     ┌───┼───────────┐
     ▼   ▼           ▼
 Search index  Cache invalidate  Analytics
```

### Zero-downtime schema / data updates ด้วย events

1. **Expand**: เพิ่ม column ใหม่ / เขียน dual-write หรือ CDC ไป projection ใหม่
2. **Migrate**: backfill จาก snapshot + ตาม CDC tail
3. **Contract**: เลิกใช้ของเก่าเมื่อ traffic ย้ายครบ

ห้าม "lock ทั้งตารางแล้วแก้ยาว ๆ" บนระบบที่มี traffic สูงถ้ามีทาง CDC / expand-contract

ใน lab นี้เรา **จำลอง CDC events** โดยไม่ต้องติดตั้ง Debezium เต็มชุด — โฟกัสที่ consumer ที่ update read model

---

## 7. Best Practices สรุป

1. **ตั้งเป้า semantic ให้ชัดต่อ use case** — เงิน vs metrics คนละระดับความเข้ม
2. **Idempotency เป็นค่าเริ่มต้น** ของ consumer ที่ทำ side effect
3. **Partition / quorum เป็นการตัดสินใจความจุและความทนทาน** ไม่ใช่แค่ config สวย ๆ
4. **มี DLQ + alert + runbook** ก่อนขึ้น production
5. **Backpressure ดีกว่า crash** — ช้าอย่างมีขอบเขตดีกว่า OOM
6. **Monitor lag และ DLQ เป็น SLO**
7. **ใช้ CDC / expand-contract** สำหรับการเปลี่ยนข้อมูลขนาดใหญ่โดยไม่ดาวน์ไทม์

---

## ลำดับการรันตัวอย่าง

```bash
docker compose up -d
npm install

node 03-expert/examples/01-delivery-semantics/idempotent.js
node 03-expert/examples/02-scaling-quorum/quorum-and-partitions.js
node 03-expert/examples/03-resilience-patterns/retry-backoff.js
node 03-expert/examples/04-ops-cdc/cdc-simulator.js
```

เมื่อพร้อมแล้ว ไปทำ Lab: [`LAB.md`](./LAB.md)

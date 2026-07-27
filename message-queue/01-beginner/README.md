# Level 1 — Beginner: Messaging Foundations & Core Topologies

เป้าหมายระดับนี้: ให้คุณเข้าใจ **ทำไมต้องใช้ message broker** และเริ่มใช้งาน RabbitMQ / Kafka ได้จริง
ไม่ใช่แค่รัน `publish` / `consume` — เพื่อเลือก topology และเครื่องมือให้เหมาะกับงาน

---

## สารบัญ

1. [Message Queues vs Event Streaming](#1-message-queues-vs-event-streaming)
2. [Producer, Consumer, Broker และ Message Payload](#2-producer-consumer-broker-และ-message-payload)
3. [RabbitMQ Core — Exchange, Queue, Binding](#3-rabbitmq-core--exchange-queue-binding)
4. [ประเภท Exchange: Direct, Fanout, Topic, Headers](#4-ประเภท-exchange-direct-fanout-topic-headers)
5. [Message Acknowledgement (ACK / NACK)](#5-message-acknowledgement-ack--nack)
6. [Kafka Basics — Topics, Partitions, Brokers](#6-kafka-basics--topics-partitions-brokers)
7. [Kafka Producers, Consumers และ Consumer Groups](#7-kafka-producers-consumers-และ-consumer-groups)
8. [Best Practices สรุป](#8-best-practices-สรุป)

---

## 1. Message Queues vs Event Streaming

ทั้งสองเป็นรูปแบบของ **asynchronous messaging** แต่โมเดลข้อมูลและการใช้งานต่างกันชัดเจน

| มิติ       | Message Queue (เช่น RabbitMQ)                           | Event Streaming (เช่น Kafka)                 |
| ---------- | ------------------------------------------------------- | -------------------------------------------- |
| โมเดล      | คิวงาน — message ถูก **consume แล้วมักถูกลบ** ออกจากคิว | Event log — เก็บตาม **retention** อ่านซ้ำได้ |
| Consumer   | แข่งกันกิน (competing consumers) เป็นค่าเริ่มต้น        | หลายกลุ่มอ่านคนละ offset ได้พร้อมกัน         |
| Routing    | Exchange + Binding อเนกประสงค์                          | Publish ไป topic; consumer เลือก subscribe   |
| Throughput | สูงพอสำหรับงานส่วนใหญ่                                  | ออกแบบมาเพื่อ **very high throughput**       |
| Replay     | ยาก (ต้องออกแบบ DLQ/archive เอง)                        | ง่าย — เลื่อน offset ย้อนหลัง                |
| Use case   | Task queue, RPC, notification routing                   | CDC, analytics, event sourcing, audit log    |

```
Message Queue (RabbitMQ)            Event Stream (Kafka)
─────────────────────────            ─────────────────────────
Producer → Exchange → Queue → Worker Producer → Topic[P0|P1|P2]
             ↘ Queue → Worker                     ↑
                                      Consumer Group A (offset)
                                      Consumer Group B (offset อีกชุด)
```

> **กฎทอง:** ถ้าคำถามคือ "ใครควรทำงานนี้หนึ่งครั้ง?" → คิดแบบ **Queue**
> ถ้าคำถามคือ "เกิดอะไรขึ้นในระบบ ตามลำดับเวลา?" → คิดแบบ **Stream**

ดูเปรียบเทียบสั้น ๆ: [`examples/01-messaging-concepts/`](./examples/01-messaging-concepts/)

---

## 2. Producer, Consumer, Broker และ Message Payload

### บทบาทหลัก

| บทบาท                     | หน้าที่                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| **Producer / Publisher**  | สร้างและส่ง message เข้า broker                                         |
| **Broker**                | รับ จัดเก็บ (ชั่วคราวหรือถาวร) และส่งต่อ — RabbitMQ node / Kafka broker |
| **Consumer / Subscriber** | ดึงหรือรับ message แล้วประมวลผล                                         |
| **Payload**               | เนื้อหาของ message (มักเป็น JSON bytes) + headers/metadata              |

### โครงสร้าง Message ที่ดี

```json
{
  "id": "msg-9f3a2c",
  "type": "order.created",
  "version": 1,
  "occurredAt": "2026-07-18T10:00:00.000Z",
  "data": {
    "orderId": "ORD-1001",
    "amount": 1290
  }
}
```

แนวทางออกแบบ payload:

1. มี **idempotency key** (`id`) เสมอ — consumer จะประมวลผลซ้ำอย่างปลอดภัยได้
2. มี **type + version** — รองรับ schema evolution
3. เก็บ **business data ใน `data`** แยกจาก metadata ของ envelope
4. หลีกเลี่ยง payload ใหญ่เกิน (พิจารณา claim-check: เก็บไฟล์ใน object storage แล้วส่งแค่ reference)

### Synchronous vs Asynchronous

```
Sync (HTTP):  Client ──request──▶ Service ──response──▶ Client
     (รอจนจบ — coupling สูง, latency รวมกัน)

Async (Queue): Client ──▶ API ──publish──▶ Broker
        │
       202 Accepted
            Consumer ──▶ side effects
```

ข้อดีของ async: ลด coupling, รับ traffic กระชากได้, แยกทีม/บริการได้
ข้อเสีย: ความซับซ้อนของ eventual consistency, debugging ยากขึ้น, ต้องคิด failure/retry

---

## 3. RabbitMQ Core — Exchange, Queue, Binding

ใน RabbitMQ **Producer ไม่ส่งตรงเข้า Queue** (ยกเว้น default exchange)
แต่ส่งเข้า **Exchange** แล้ว Exchange ใช้ **Binding rules** ตัดสินใจว่าจะส่งต่อไป Queue ไหน

```
Publisher ──routing key──▶ Exchange ──binding──▶ Queue ──▶ Consumer
        │
        └──▶ Queue ──▶ Consumer
```

| องค์ประกอบ      | ความหมาย                                                |
| --------------- | ------------------------------------------------------- |
| **Exchange**    | จุดรับ message จาก publisher แล้ว route                 |
| **Queue**       | ที่เก็บ message รอ consumer                             |
| **Binding**     | กฎเชื่อม Exchange ↔ Queue (มักมี binding key / pattern) |
| **Routing key** | string ที่ publisher แนบมากับ message                   |
| **Vhost**       | namespace แยกสิทธิ์/config (เหมือน virtual broker)      |

### ความทนทานพื้นฐาน

- **Durable queue / durable exchange** — อยู่รอดหลัง broker restart
- **Persistent message** (`deliveryMode: 2`) — เขียนลงดิสก์ (ยังไม่เท่า "ไม่สูญเสีย 100%" ถ้าไม่ใช้ confirms + quorum)
- **Exclusive / auto-delete** — ใช้กับ temporary consumer เท่านั้น อย่าใช้กับงานธุรกิจหลัก

ดูตัวอย่าง: [`examples/02-rabbitmq-exchanges/`](./examples/02-rabbitmq-exchanges/)

---

## 4. ประเภท Exchange: Direct, Fanout, Topic, Headers

### Direct

Route เมื่อ **routing key ตรงกับ binding key พอดี**

```
order.payments ──▶ payments_queue
order.shipping ──▶ shipping_queue
```

เหมาะกับ: ส่งงานไปคิวเฉพาะเจาะจง

### Fanout

**Broadcast** ไปทุก queue ที่ bind ไว้ — **ไม่สนใจ routing key**

```
notifications_exchange (fanout)
 ├─▶ email_queue
 ├─▶ sms_queue
 └─▶ push_queue
```

เหมาะกับ: แจ้งเตือนหลายช่องทางจาก event เดียว

### Topic

Route ด้วย **pattern** ของ routing key แบบจุดคั่น (`*`, `#`)

| Pattern | ความหมาย                |
| ------- | ----------------------- |
| `*`     | คำเดียว (หนึ่ง segment) |
| `#`     | ศูนย์หรือหลาย segment   |

```
Routing key: order.created.th
Bindings:
 order.*.th      → th_orders
 order.created.# → all_created
 #               → audit_all
```

เหมาะกับ: multi-tenant, multi-region, event taxonomy

### Headers

Route ตาม **header attributes** ไม่ใช้ routing key
ยืดหยุ่นแต่มักช้าและอ่านยากกว่า topic — ใช้เมื่อเงื่อนไขไม่พอด้วย string pattern

### ตารางเลือก Exchange

| ความต้องการ                 | เลือก                                      |
| --------------------------- | ------------------------------------------ |
| 1:1 ไปคิวตายตัว             | Direct                                     |
| Broadcast ทุก subscriber    | Fanout                                     |
| จัดหมวดด้วยชื่อแบบลำดับชั้น | Topic                                      |
| เงื่อนไขหลายฟิลด์ซับซ้อน    | Headers (หรือพิจารณา Kafka + filter ในแอป) |

---

## 5. Message Acknowledgement (ACK / NACK)

ACK คือสัญญาว่า consumer **ประมวลผลสำเร็จแล้ว** broker จึงลบ message ออกจากคิวได้

| โหมด              | พฤติกรรม                      | ความเสี่ยง                                      |
| ----------------- | ----------------------------- | ----------------------------------------------- |
| **Auto-ack**      | broker ถือว่าส่งแล้ว = สำเร็จ | ถ้า process ตายกลางคัน → **message หาย**        |
| **Manual ACK**    | แอปเรียก `ack` หลังทำเสร็จ    | ถ้าลืม ack / ช้า → message ค้าง / redelivery    |
| **NACK / reject** | บอกว่าประมวลผลไม่สำเร็จ       | เลือก requeue หรือทิ้ง (ไป DLX ได้ในระดับถัดไป) |

```
Consumer รับ message
 │
 ├─ สำเร็จ ──▶ channel.ack(msg)
 │
 └─ ล้มเหลวชั่วคราว ──▶ channel.nack(msg, false, true)  // requeue
   หรือถาวร      ──▶ channel.nack(msg, false, false) // ไม่ requeue
```

### Prefetch (QoS)

`channel.prefetch(n)` จำกัดจำนวน unacked messages ต่อ consumer

- `prefetch=1` → กระจายงานยุติธรรมใน work queue
- ค่าสูงเกินไป → consumer หนึ่งตัวกินงานหมด + memory พอง

ดูตัวอย่าง: [`examples/03-rabbitmq-ack/`](./examples/03-rabbitmq-ack/)

---

## 6. Kafka Basics — Topics, Partitions, Brokers

### Topic

ชื่อ logical stream เช่น `orders`, `payments`, `user-events`
Producer เขียนเข้า topic; Consumer อ่านจาก topic

### Partition

Topic ถูกแบ่งเป็น **partitions** เพื่อ:

1. **Parallelism** — consumer ในกลุ่มเดียวกันอ่านคนละ partition ได้พร้อมกัน
2. **Ordering** — ลำดับรับประกัน **ภายใน partition เดียว** เท่านั้น ไม่ข้าม partition
3. **Scale** — เพิ่ม partition (ระวัง: ลดจำนวนภายหลังยาก)

```
Topic: orders
┌─────────────┬─────────────┬─────────────┐
│ Partition 0 │ Partition 1 │ Partition 2 │
│ offset 0..n │ offset 0..m │ offset 0..k │
└─────────────┴─────────────┴─────────────┘
```

### Broker & Cluster

- **Broker** = หนึ่ง Kafka server process
- **Cluster** = หลาย broker เพื่อ HA และกระจาย partition
- ใน lab นี้ใช้ **KRaft mode** (ไม่มี ZooKeeper) ผ่าน Docker Compose

### Retention

Kafka **ไม่ลบ** message ทันทีหลัง consume — เก็บตามเวลา (`retention.ms`) หรือขนาด (`retention.bytes`)
นี่คือเหตุผลที่ "replay" ได้

ดูตัวอย่าง: [`examples/04-kafka-basics/`](./examples/04-kafka-basics/)

---

## 7. Kafka Producers, Consumers และ Consumer Groups

### Producer

- ส่ง record: `{ topic, key?, value, headers? }`
- **Key** กำหนดว่า record ไป partition ไหน (hash(key) % numPartitions)
  → records ที่ key เดียวกันอยู่ partition เดียวกัน → **เรียงลำดับต่อกันได้**

### Consumer Group

กลุ่ม consumer ที่ใช้ `groupId` เดียวกันจะ **แบ่ง partitions กัน**
แต่ละ partition ถูก assign ให้ consumer ในกลุ่มได้ทีละหนึ่งตัว

```
Topic orders (3 partitions)     Consumer Group "billing"
P0 ──────────────────────────▶ consumer-1
P1 ──────────────────────────▶ consumer-2
P2 ──────────────────────────▶ consumer-3

Consumer Group "analytics" (อีกกลุ่ม) อ่าน topic เดียวกันได้อิสระ
```

กฎสำคัญ:

- จำนวน consumer ในกลุ่มที่ active **ไม่ควรเกิน** จำนวน partitions (เกินแล้วจะ idle)
- เพิ่ม parallelism → เพิ่ม partitions (และแผน rebalance)

### Offset

ตำแหน่งที่ consumer อ่านถึงในแต่ละ partition

- Commit offset = "ฉันประมวลผลถึงตรงนี้แล้ว"
  รายละเอียด commit / rebalance จะเจาะลึกในระดับ Intermediate

---

## 8. Best Practices สรุป

1. **เลือก Queue vs Stream ตามคำถามธุรกิจ** ไม่ตามกระแสเทคโนโลยี
2. **ตั้งชื่อ routing key / topic ให้เป็น taxonomy** ที่ทีมเข้าใจ (`domain.event.version`)
3. **อย่าใช้ auto-ack** กับงานที่มีผลข้างเคียง (เขียน DB, ตัดบัตร)
4. **ใส่ message id + version ในทุก payload**
5. **Durable + persistent** สำหรับงานที่สูญเสียไม่ได้ (และรู้ข้อจำกัดของมัน)
6. **ออกแบบจำนวน Kafka partitions ตาม throughput ที่คาด** ไม่ใช่เริ่มที่ 1 แล้วหวัง
7. **ใช้ Management UI / kafka-topics เพื่อสังเกต** ตอนเรียน — สร้าง intuition ก่อน automate

---

## ลำดับการรันตัวอย่าง

```bash
# จาก root ของ messaging-queue-bootcamp
docker compose up -d
npm install

node 01-beginner/examples/01-messaging-concepts/compare.js
node 01-beginner/examples/02-rabbitmq-exchanges/direct.js
node 01-beginner/examples/02-rabbitmq-exchanges/fanout.js
node 01-beginner/examples/02-rabbitmq-exchanges/topic.js
node 01-beginner/examples/03-rabbitmq-ack/ack-demo.js
node 01-beginner/examples/04-kafka-basics/produce-consume.js
```

เมื่อพร้อมแล้ว ไปทำ Lab: [`LAB.md`](./LAB.md)

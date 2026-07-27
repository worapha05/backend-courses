# Lab ระดับ Expert — ศูนย์แจ้งเตือนระดับองค์กร "AetherNotify"

## เป้าหมาย

ออกแบบและ implement ระบบแจ้งเตือน real-time ระดับ production-ready สำหรับ **AetherNotify**:

- Guaranteed delivery แบบ **effectively-once** (at-least-once + idempotency)
- ทนโหลดด้วย **Kafka partitions** และคิวงาน **RabbitMQ** พร้อม quorum (หรือ durable เทียบเท่าใน lab)
- **Retry แบบ exponential backoff**, poison pill → DLQ, circuit breaker ต่อ provider
- จำลอง **CDC** สำหรับ update preference ผู้ใช้โดยไม่ดาวน์ไทม์
- กำหนด **lag SLO + runbook** สั้น ๆ

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## กรณีศึกษา

**AetherNotify** ส่งอีเมล / push ให้ลูกค้าธนาคารดิจิทัล
คืนหนึ่งเกิดเหตุ:

1. Provider อีเมลล่ม 15 นาที — worker ยิงซ้ำจน thread หมด แล้ว process OOM
2. Message พิษ (payload ขาด `userId`) ทำให้ partition หนึ่งค้าง
3. ทีมต้องการเปลี่ยน schema ของตาราง `user_preferences` โดยไม่ปิดระบบ
4. ฝ่าย SRE ถามว่า lag เท่าไรถึงถือว่าผิดปกติ

คุณได้รับมอบหมายให้สร้าง **reference architecture + โค้ดแล็บ** ที่แก้ทั้งชุด

---

## โจทย์

### ส่วนที่ 1 — Ingest Pipeline

1. API จำลองรับ `POST /notify` (function ก็ได้) แล้ว publish ไป Kafka topic
   `aether.notify.commands` (**6 partitions**)
   key = `userId`, value มีอย่างน้อย:

```json
{
  "commandId": "cmd-...",
  "userId": "U-1",
  "channel": "email",
  "template": "otp",
  "payload": { "code": "123456" }
}
```

2. Consumer group `aether-dispatcher` อ่านคำสั่ง แล้ว enqueue งานไป RabbitMQ queue
   `aether.notify.jobs` (quorum ถ้าได้, ไม่ได้ใช้ durable classic)
   พร้อม DLX → `aether.notify.dlq`

### ส่วนที่ 2 — Resilient Sender Workers

Worker ส่งแจ้งเตือน (จำลอง) ต้องมี:

1. `prefetch(1)` เป็น backpressure
2. Idempotency: ถ้า `commandId` เคยส่งสำเร็จแล้ว → ACK แล้วข้าม (อย่าส่งซ้ำ)
3. Circuit breaker ต่อ `email` provider

- เมื่อเปิดวงจร ให้ส่งงานเข้า delay/retry queue ไม่ยิง provider ตรง ๆ

4. Exponential backoff อย่างน้อย 3 ระดับ (เช่น 1s / 2s / 4s) แล้วค่อย DLQ
5. ถ้า `payload.poison === true` หรือขาด `userId` → DLQ ทันที

ทดสอบด้วยชุดคำสั่งที่มีทั้งสำเร็จ, fail ชั่วคราว, และ poison

### ส่วนที่ 3 — CDC Preferences (Zero-downtime)

1. Produce CDC events ไป topic `aether.cdc.user-preferences`
2. Consumer update in-memory read model: `userId → { emailOptIn, pushOptIn }`
3. Dispatcher **ต้องอ่าน read model** — ถ้า `emailOptIn === false` ให้ข้ามการส่งอีเมลอย่างสง่างาม (emit skip event ก็ได้)

จำลอง expand-contract: เพิ่มฟิลด์ `locale` ใน `after` โดย consumer เก่ายังไม่พัง (ignore ฟิลด์ที่ไม่รู้จัก)

### ส่วนที่ 4 — Ops Artifact

สร้าง `RUNBOOK.md` ระบุ:

1. lag SLO ตัวอย่าง (เช่น command topic lag < 1,000 นานไม่เกิน 5 นาที)
2. ขั้นตอนตอน DLQ > 0
3. ขั้นตอนตอน circuit open นานกว่า 10 นาที
4. วิธีประมาณ lag ใน lab (log / metric จำลองก็ได้)

### ส่วนที่ 5 — คำถามคิด (`NOTES.md`)

1. Idempotent producer ของ Kafka ช่วยอะไร และไม่ช่วยอะไรใน AetherNotify?
2. ทำไมเลือก key = `userId` บน command topic?
3. At-least-once ที่ dispatcher (Kafka→Rabbit) อาจสร้าง duplicate job ได้อย่างไร และแก้ที่ชั้นไหน?

---

## เกณฑ์ผ่าน

- [ ] Command → Kafka → Rabbit → Worker ทำงานครบ
- [ ] Idempotency กันส่งซ้ำได้
- [ ] Backoff + DLQ + circuit breaker มีพฤติกรรมสังเกตได้จาก log
- [ ] CDC update preference และมีผลต่อการส่ง
- [ ] `RUNBOOK.md` + `NOTES.md` ครบ

---

## เฉลย

```bash
node 03-expert/lab/solution/aether-notify.js
```

ดู [`lab/solution/`](./lab/solution/)

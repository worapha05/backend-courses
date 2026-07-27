# Level 3 — Expert: Concurrency, Scale & Clean Architecture

ระดับนี้เปลี่ยนคุณจาก “เขียน API ได้” เป็น “ออกแบบระบบที่ทนโหลดและดูแลระยะยาวได้”

---

## สารบัญ

1. [Concurrency Mindset](#1-concurrency-mindset)
2. [Goroutines & Channels](#2-goroutines--channels)
3. [Buffered Channels, select, Mutex, WaitGroup](#3-buffered-channels-select-mutex-waitgroup)
4. [context.Context](#4-contextcontext)
5. [Worker Pool ประสิทธิภาพสูง](#5-worker-pool-ประสิทธิภาพสูง)
6. [Clean Architecture ใน Go](#6-clean-architecture-ใน-go)
7. [Anti-Patterns ที่พบบ่อย](#7-anti-patterns-ที่พบบ่อย)
8. [Best Practices สรุป](#8-best-practices-สรุป)

---

## 1. Concurrency Mindset

| คำ              | ความหมาย                                             |
| --------------- | ---------------------------------------------------- |
| **Concurrency** | โครงสร้างโปรแกรมที่จัดการหลายงาน “พร้อมกันเชิงตรรกะ” |
| **Parallelism** | รันหลายงานพร้อมกันจริงบนหลาย core                    |

Go ทำให้ concurrency ถูกและง่าย — แต่ **ถูกเกินไปจนคนเปิด goroutine โดยไม่คิด lifecycle**

กฎทองจาก Rob Pike:

> Do not communicate by sharing memory; share memory by communicating.

แปลปฏิบัติ: ใช้ channel ส่งข้อมูลระหว่าง goroutine แทนการแชร์ตัวแปรแล้วล็อคมั่ว ๆ
แต่ในระบบจริง **mutex ยังจำเป็น** สำหรับ shared state ใน memory (cache, in-memory map)

---

## 2. Goroutines & Channels

```go
go func() {
 // งานเบา ๆ ที่รันอิสระ
}()

ch := make(chan string)
go func() { ch <- "done" }()
msg := <-ch
```

### คุณสมบัติสำคัญ

- Unbuffered channel: ส่ง/รับต้องพร้อมพร้อมกัน (handshake)
- ปิด channel ด้วย `close(ch)` ฝั่งผู้ส่งเท่านั้น
- อ่านจาก closed channel ได้ค่า zero + `ok == false`

```go
v, ok := <-ch
if !ok {
 // channel ถูกปิดแล้ว
}
```

---

## 3. Buffered Channels, select, Mutex, WaitGroup

### Buffered Channel

```go
ch := make(chan Job, 100) // คิวได้ 100 งานโดยผู้ส่งไม่ต้องรอทันที
```

ใช้เป็น **queue คั่นระหว่าง producer/consumer**
ระวัง: buffer ใหญ่เกินไป = ซ่อนปัญหา backpressure

### select

เลือกทำได้หลาย channel operation:

```go
select {
case job := <-jobs:
 process(job)
case <-ctx.Done():
 return ctx.Err()
case <-time.After(2 * time.Second):
 return errors.New("timeout")
}
```

### sync.WaitGroup

รอให้ชุด goroutine ทำงานเสร็จ:

```go
var wg sync.WaitGroup
for _, t := range tasks {
 wg.Add(1)
 go func(t Task) {
  defer wg.Done()
  handle(t)
 }(t)
}
wg.Wait()
```

### sync.Mutex / RWMutex

```go
var mu sync.Mutex
mu.Lock()
shared[key] = value
mu.Unlock()
```

ใช้เมื่อมี shared memory ที่ channel ไม่สะดวก
`RWMutex` เหมาะเมื่ออ่านเยอะ เขียนน้อย

---

## 4. context.Context

`context` คือกลไกมาตรฐานของ Go สำหรับ:

- Deadline / Timeout
- Cancellation ส่งต่อตาม call chain
- ค่า request-scoped (ระวัง: อย่าใส่ optional params ทุกอย่างลง context)

```go
ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
defer cancel()

row := db.QueryRowContext(ctx, "SELECT ...")
```

### ใน HTTP API

1. เริ่มจาก `r.Context()` ของ request
2. deriv ย่อยด้วย timeout สำหรับ DB / HTTP client ภายนอก
3. เมื่อ client ยกเลิก request — context cancel → หยุดงานที่รองรับ

```go
select {
case <-ctx.Done():
 return ctx.Err() // context.Canceled หรือ DeadlineExceeded
default:
}
```

**ห้าม** สร้าง `context.Background()` ลึกใน business logic ถ้ามี ctx จาก request อยู่แล้ว

---

## 5. Worker Pool ประสิทธิภาพสูง

ปัญหา: งานหนักจำนวนมาก (scrape, generate Excel, resize รูป)
ถ้า `go` ทีละงานโดยไม่จำกัด → ระเบิด memory / file descriptor / DB conn

### โครง Worker Pool

```
Producer → jobs channel (buffered) → N workers → results channel → collector
     ↑
   context cancel
```

องค์ประกอบ:

| ส่วน                   | หน้าที่                                  |
| ---------------------- | ---------------------------------------- |
| Worker count           | จำกัด concurrency ตาม CPU / I/O          |
| Jobs channel           | คิวงาน + backpressure                    |
| WaitGroup              | รอ worker ปิดสวย                         |
| Context                | ยกเลิกทั้ง pool เมื่อ timeout / shutdown |
| Result / Error channel | รวมผลแบบควบคุมได้                        |

Use cases ตรงโจทย์ Full-stack:

- Export Excel หมื่นแถวแบบ async แล้วแจ้งผ่าน webhook/email
- Scrape / sync ข้อมูลจาก API ภายนอกหลายแหล่ง
- Generate thumbnail / PDF เป็นชุด

---

## 6. Clean Architecture ใน Go

เป้าหมาย: **ธุรกิจไม่ผูกกับ framework และ database**

```
┌─────────────────────────────────────┐
│   Interfaces (HTTP)   │ ← Gin/Fiber/handlers
├─────────────────────────────────────┤
│   Use Cases     │ ← application services
├─────────────────────────────────────┤
│   Domain     │ ← entities + domain rules
├─────────────────────────────────────┤
│   Infrastructure   │ ← Postgres, S3, SMTP, ...
└─────────────────────────────────────┘
```

ทิศทาง dependency: **ชี้เข้าด้านในเสมอ**

- Domain ไม่ import Gin/GORM
- Use case พึ่ง domain + interface ของ repository
- Infrastructure implement interface เหล่านั้น
- HTTP handler เรียก use case อย่างเดียว

### โครง folder ตัวอย่าง

```
cmd/api/main.go
internal/
 domain/user.go
 usecase/register_user.go
 adapter/http/user_handler.go
 adapter/postgres/user_repo.go
```

ข้อดีที่สัมผัสได้:

- เปลี่ยน Gin → Fiber โดยไม่แก้ business
- ทดสอบ use case ด้วย fake repo
- Onboard คนใหม่เข้าใจขอบเขตชัด

อย่า over-engineer: CRUD เล็ก ๆ อาจใช้โครง 3 ชั้น (handler/service/repo) ก็พอ
Clean Architecture เต็มรูปแบบคุ้มเมื่อ domain มีความซับซ้อน

---

## 7. Anti-Patterns ที่พบบ่อย

| Anti-pattern             | ผลเสีย          | ทางแก้                     |
| ------------------------ | --------------- | -------------------------- |
| Goroutine รั่วใน handler | memory leak     | ผูกกับ ctx + WaitGroup     |
| Unbounded fan-out        | ล่มตอน spike    | worker pool                |
| Mutex ถือทับ I/O นาน     | throughput ต่ำ  | ลด critical section        |
| Context ไม่ส่งต่อ        | timeout ไม่มีผล | ใส่ ctx เป็น parameter แรก |
| Domain import GORM model | coupling        | แยก entity / DTO           |
| God interface ยักษ์      | mock ยาก        | interface เล็กตาม ISP      |

---

## 8. Best Practices สรุป

1. parameter แรกของ function I/O ควรเป็น `ctx context.Context`
2. จำกัด concurrency เสมอเมื่อรับงานจากภายนอก
3. Shutdown ด้วย signal (`SIGINT`) แล้ว cancel context รวม
4. วัดด้วย benchmark / pprof ก่อน optimize
5. Interface อยู่ฝั่ง use case — infra เป็นผู้ตาม
6. Error ของ domain แยกจาก error ของ HTTP transport
7. Log ด้วย request id จาก context เพื่อ trace

---

## ไฟล์ตัวอย่าง

| folder                                                                 | เนื้อหา                                      |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| [`examples/01-concurrency/`](./examples/01-concurrency/)               | Goroutine, channel, select, mutex, WaitGroup |
| [`examples/02-context/`](./examples/02-context/)                       | Timeout / cancel ใน API-style flow           |
| [`examples/03-worker-pool/`](./examples/03-worker-pool/)               | Worker pool สำหรับงาน batch                  |
| [`examples/04-clean-architecture/`](./examples/04-clean-architecture/) | โครง Clean Architecture ย่อส่วน              |

## Lab

[`LAB.md`](./LAB.md) — สร้าง Export Service + Clean Architecture
เฉลย: [`lab/solution/`](./lab/solution/)

**ก่อนหน้า ← [`../02-intermediate/`](../02-intermediate/)** · **กลับหน้าหลัก → [`../README.md`](../README.md)**

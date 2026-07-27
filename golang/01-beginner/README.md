# Level 1 — Beginner: Go Core for Web

เป้าหมายระดับนี้: ให้คุณเขียน Go ได้ถูกต้องพอสำหรับสร้าง HTTP API ด้วย standard library
โดยเข้าใจ **ทำไม Go จึงออกแบบแบบนี้** ไม่ใช่แค่ syntax

---

## สารบัญ

1. [ทำไม Full-stack Dev ต้องเรียน Go](#1-ทำไม-full-stack-dev-ต้องเรียน-go)
2. [Syntax พื้นฐานที่สำคัญจริง ๆ](#2-syntax-พื้นฐานที่สำคัญจริง-ๆ)
3. [Pointers — เมื่อไหร่ควรใช้](#3-pointers--เมื่อไหร่ควรใช้)
4. [Error Handling แบบ Explicit](#4-error-handling-แบบ-explicit)
5. [Execution Model ของ Go](#5-execution-model-ของ-go)
6. [Structs & Methods](#6-structs--methods)
7. [Interfaces แบบ Implicit](#7-interfaces-แบบ-implicit)
8. [JSON Marshalling / Unmarshalling](#8-json-marshalling--unmarshalling)
9. [HTTP ด้วย `net/http`](#9-http-ด้วย-nethttp)
10. [Best Practices สรุป](#10-best-practices-สรุป)

---

## 1. ทำไม Full-stack Dev ต้องเรียน Go

Go ถูกออกแบบมาสำหรับ **ระบบ backend ที่ต้องเร็ว ชัดเจน และดูแลง่ายในทีมใหญ่**

| จุดเปรียบเทียบ | Node.js / Python     | Go                          |
| -------------- | -------------------- | --------------------------- |
| Type system    | Dynamic / optional   | Static + compile-time       |
| Concurrency    | Event loop / asyncio | Goroutine เบา + channel     |
| Deploy         | Runtime + deps       | Binary เดียว                |
| Error style    | try/catch / Promise  | คืนค่า `error` ชัดเจน       |
| Performance    | ดีพอส่วนใหญ่         | ใกล้ C สำหรับ I/O-bound API |

สำหรับ Full-stack ที่เคยเขียน Express/Nest/FastAPI — Go จะรู้สึก “เข้มงวดกว่า”
แต่ความเข้มงวดนั้นคือสิ่งที่ช่วยให้ production API เสถียรขึ้น

---

## 2. Syntax พื้นฐานที่สำคัญจริง ๆ

### 2.1 Package และ Entry Point

ทุกโปรแกรมที่รันได้ต้องมี `package main` และ `func main()`

```go
package main

import "fmt"

func main() {
 fmt.Println("hello")
}
```

- ชื่อไฟล์ไม่สำคัญเท่าชื่อ package
- `import` ที่ไม่ใช้ = compile error (บังคับความสะอาด)

### 2.2 ตัวแปรและการประกาศ

```go
var name string = "Go" // แบบเต็ม
age := 30    // short declaration (ใน function เท่านั้น)
const MaxRetry = 3  // ค่าคงที่
```

**Zero value** สำคัญมากใน Go:

| Type                                               | Zero value |
| -------------------------------------------------- | ---------- |
| `int`, `float`                                     | `0`        |
| `bool`                                             | `false`    |
| `string`                                           | `""`       |
| pointer / slice / map / channel / interface / func | `nil`      |

การออกแบบให้มี zero value ที่ปลอดภัยช่วยลด nil panic

### 2.3 Slice vs Array

- **Array**: ขนาดคงที่ `var a [3]int`
- **Slice**: มุมมองแบบ dynamic บน array — ใช้เกือบทุกที่ใน Go

```go
nums := []int{1, 2, 3}
nums = append(nums, 4)
```

---

## 3. Pointers — เมื่อไหร่ควรใช้

Pointer เก็บ **ที่อยู่หน่วยความจำ** ของค่า ไม่ใช่ค่าเอง

```go
x := 10
p := &x // ได้ *int
*p = 20 // แก้ค่าผ่าน pointer → x กลายเป็น 20
```

### เมื่อไหร่ควรส่ง Pointer

| ส่งค่า (value)              | ส่ง pointer             |
| --------------------------- | ----------------------- |
| Struct เล็ก / immutable-ish | ต้องแก้ค่าต้นฉบับ       |
| ไม่ต้องการ side effect      | Struct ใหญ่ ลด copy     |
| Method ที่อ่านอย่างเดียว    | Method ที่ mutate state |

**กฎง่าย ๆ สำหรับ Web API:**

- Request DTO → มักเป็น value หรือ pointer ก็ได้ (ทีมส่วนใหญ่ใช้ pointer กับ JSON decode)
- Domain entity ที่ต้อง update field → ใช้ pointer receiver
- อย่าใช้ pointer กับ primitive เล็ก ๆ โดยไม่จำเป็น

```go
type User struct {
 Name string
}

func (u User) RenameCopy(name string) {
 u.Name = name // แก้แค่ copy
}

func (u *User) Rename(name string) {
 u.Name = name // แก้ของจริง
}
```

---

## 4. Error Handling แบบ Explicit

Go **ไม่มี try/catch**
Error คือค่าปกติประเภท `error` ที่ function คืนกลับมา

```go
result, err := doSomething()
if err != nil {
 return fmt.Errorf("doSomething failed: %w", err)
}
```

### เปรียบเทียบกับ try/catch

| try/catch                   | Go explicit error                      |
| --------------------------- | -------------------------------------- |
| Exception กระโดดออกจาก flow | Error ไหลตาม return path               |
| ลืมจับได้ง่าย               | Compiler ไม่บังคับ แต่ convention เข้ม |
| Stack unwind มีต้นทุน       | เบาและคาดเดาได้                        |

### Best Practices

1. **ห่อ error ด้วย context** — ใช้ `%w` เพื่อ unwrap ได้ภายหลัง
2. **อย่ากลืน error** — `_, _ = f()` โดยไม่เหตุผล = บั๊กรอเกิด
3. **สร้าง sentinel / custom error** เมื่อต้องการแยกประเภทที่ชั้น handler

```go
var ErrNotFound = errors.New("not found")

if errors.Is(err, ErrNotFound) {
 // ตอบ 404
}
```

---

## 5. Execution Model ของ Go

### 5.1 Compile → Single Binary

```
.go source → go build → binary เดียว (มัก static)
```

ดีต่อการ deploy: ไม่ต้องติดตั้ง runtime บน server

### 5.2 Goroutine (พรีวิว — ลึกที่ Expert)

```go
go process(job) // เริ่มงานแบบ concurrent
```

Go runtime จัด schedule goroutine บน OS threads (M:N model)
ในระดับ Beginner จำไว้ว่า: **อย่าเปิด goroutine ใน HTTP handler โดยไม่ควบคุม lifecycle**

### 5.3 Defer

```go
f, err := os.Open("a.txt")
if err != nil { return err }
defer f.Close() // ปิดเมื่อ function จบ ไม่ว่าจะ return ทางไหน
```

ใช้กับ: ปิดไฟล์, unlock mutex, rollback transaction

---

## 6. Structs & Methods

Struct คือกลุ่ม field — หน่วยข้อมูลหลักของ Go (แทน class)

```go
type Product struct {
 ID string `json:"id"`
 Name string `json:"name"`
 Price float64 `json:"price"`
}

func (p Product) Display() string {
 return fmt.Sprintf("%s: %.2f", p.Name, p.Price)
}
```

### Embedding (Composition)

```go
type Timestamps struct {
 CreatedAt time.Time
 UpdatedAt time.Time
}

type Order struct {
 ID string
 Timestamps // embed → Order มี CreatedAt โดยตรง
}
```

Go สนับสนุน **composition over inheritance** อย่างชัดเจน

---

## 7. Interfaces แบบ Implicit

Interface ใน Go คือชุด method
**ประเภทใดก็ตามที่มี method ครบชุด = implement โดยอัตโนมัติ** (ไม่ต้องเขียน `implements`)

```go
type Storer interface {
 Save(id string, data []byte) error
}

type MemoryStore struct{}

func (m MemoryStore) Save(id string, data []byte) error {
 // ...
 return nil
}

// MemoryStore ใช้เป็น Storer ได้ทันที
```

### ทำไมสำคัญต่อ Web Architecture

- Handler พึ่ง interface ไม่พึ่ง concrete DB
- เปลี่ยนจาก memory → Postgres โดยไม่แก้ business logic
- ทดสอบง่ายด้วย fake/mock

**กฎทอง:** นิยาม interface ที่ฝั่ง **ผู้ใช้ (consumer)** ไม่ใช่ฝั่งผู้สร้าง (provider)

---

## 8. JSON Marshalling / Unmarshalling

```go
type CreateUserRequest struct {
 Email string `json:"email"`
 Password string `json:"password"`
}

// Encode
b, err := json.Marshal(user)

// Decode
var req CreateUserRequest
err := json.Unmarshal(body, &req)
```

### ข้อควรระวัง

| ประเด็น                                                    | รายละเอียด                        |
| ---------------------------------------------------------- | --------------------------------- |
| Field ต้องขึ้นต้นด้วยตัวพิมพ์ใหญ่                          | ไม่งั้น json ไม่เห็น (unexported) |
| ใช้ tag `json:"..."`                                       | ควบคุมชื่อ field ใน JSON          |
| Decode ต้องส่ง pointer                                     | `json.Unmarshal(b, &req)`         |
| `json.Decoder` ดีกว่าสำหรับ stream จาก `http.Request.Body` | ประหยัด memory                    |

---

## 9. HTTP ด้วย `net/http`

Standard library ของ Go แข็งแรงพอสำหรับ API จริงหลาย project

```go
http.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
 w.Header().Set("Content-Type", "application/json")
 w.WriteHeader(http.StatusOK)
 _, _ = w.Write([]byte(`{"status":"ok"}`))
})

log.Fatal(http.ListenAndServe(":8080", nil))
```

ตั้งแต่ Go 1.22+ มี method-aware routing ใน `ServeMux` แล้ว:

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", getUser)
mux.HandleFunc("POST /users", createUser)
```

### โครง Handler ที่ดี

1. อ่าน / validate input
2. เรียก business logic (ผ่าน interface)
3. map error → HTTP status
4. เขียน JSON response

อย่าใส่ SQL หรือ business rule ยาว ๆ ใน handler โดยตรง

---

## 10. Best Practices สรุป

1. **ตั้งชื่อให้สื่อความหมาย** — `err`, `ctx`, `id` เป็น idiom ที่ดี
2. **จัดการ error ทันทีที่จุดเกิด** หรือส่งต่อพร้อม context
3. **ใช้ pointer receiver เมื่อต้อง mutate หรือ struct ใหญ่**
4. **Interface เล็ก ๆ** (1–3 methods) ดีกว่า interface ยักษ์
5. **อย่า ignore error จาก `Encode`/`Write`** ใน production ควร log
6. **Validate input ที่ขอบเขต HTTP** ก่อนเข้า domain
7. **คืน JSON ที่โครงคงที่** — รวม `error` field เมื่อล้มเหลว

---

## ไฟล์ตัวอย่างในระดับนี้

| folder                                                                 | เนื้อหา                              |
| ---------------------------------------------------------------------- | ------------------------------------ |
| [`examples/01-syntax/`](./examples/01-syntax/)                         | ตัวแปร, pointer, error, defer        |
| [`examples/02-structs-interfaces/`](./examples/02-structs-interfaces/) | Struct, method, interface decoupling |
| [`examples/03-json-http/`](./examples/03-json-http/)                   | JSON + REST API ด้วย `net/http`      |

## Lab

ทำโจทย์ใน [`LAB.md`](./LAB.md) แล้วเทียบกับ [`lab/solution/`](./lab/solution/)

**ถัดไป → [`../02-intermediate/README.md`](../02-intermediate/README.md)**

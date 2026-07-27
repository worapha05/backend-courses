# Level 1 — Beginner: Modern Java & Core OOP

เป้าหมายระดับนี้: ให้คุณเขียน **Java 17/21** ได้ถูกต้องและทันสมัยพอสำหรับเข้าสู่ Spring Boot
โดยเข้าใจ **ทำไมภาษาจึงออกแบบแบบนี้** และผลกระทบต่อ memory / design — ไม่ใช่แค่ syntax

---

## สารบัญ

1. [ทำไม Enterprise ต้องอัปเกรด Java](#1-ทำไม-enterprise-ต้องอัปเกรด-java)
2. [Records — Immutable Data Carriers](#2-records--immutable-data-carriers)
3. [Sealed Classes — ปิดลำดับชั้นอย่างตั้งใจ](#3-sealed-classes--ปิดลำดับชั้นอย่างตั้งใจ)
4. [Switch Expressions](#4-switch-expressions)
5. [Stream API & Functional Style](#5-stream-api--functional-style)
6. [Collections Framework และ Memory](#6-collections-framework-และ-memory)
7. [Exception Handling ระดับ Enterprise](#7-exception-handling-ระดับ-enterprise)
8. [Design Patterns ที่ใช้ในระดับนี้](#8-design-patterns-ที่ใช้ในระดับนี้)
9. [Best Practices สรุป](#9-best-practices-สรุป)

---

## 1. ทำไม Enterprise ต้องอัปเกรด Java

| จุดเปรียบเทียบ | Java 8 mindset                     | Java 17/21                               |
| -------------- | ---------------------------------- | ---------------------------------------- |
| Data class     | boilerplate getter/setter/`equals` | `record`                                 |
| Hierarchy      | open inheritance                   | `sealed` + pattern matching              |
| Control flow   | fall-through `switch`              | expression `switch` + exhaustiveness     |
| Concurrency    | Thread + Executor                  | Virtual Threads (21) พร้อมใช้ใน Spring 3 |
| Null safety    | culture + Optional                 | ยังไม่สมบูรณ์ — ต้องออกแบบเอง            |

**Architectural choice:** ทีม Enterprise ที่ยังอยู่ Java 8 มักจ่ายต้นทุนที่ซ่อนอยู่ — boilerplate, bug จาก mutable DTO, และ switch ที่ไม่ exhaust

---

## 2. Records — Immutable Data Carriers

```java
public record Money(BigDecimal amount, String currency) {
 public Money {
 if (amount == null || amount.signum() < 0) {
  throw new IllegalArgumentException("amount must be >= 0");
 }
 Objects.requireNonNull(currency, "currency");
 }

 public Money add(Money other) {
 if (!currency.equals(other.currency)) {
  throw new IllegalArgumentException("currency mismatch");
 }
 return new Money(amount.add(other.amount), currency);
 }
}
```

### เมื่อไหร่ใช้ Record

| ใช้                              | ไม่ใช้                                                  |
| -------------------------------- | ------------------------------------------------------- |
| DTO, Value Object, Event payload | JPA Entity (ต้องการ no-arg + mutable)                   |
| API response ที่ไม่ควร mutate    | Domain Aggregate ที่ต้องมี behavior ซับซ้อนและ identity |

**Pattern:** Record = **Value Object** ใน DDD แบบเบา ๆ — equality ตามค่า ไม่ใช่ตาม identity

---

## 3. Sealed Classes — ปิดลำดับชั้นอย่างตั้งใจ

```java
public sealed interface PaymentResult
 permits PaymentResult.Success, PaymentResult.Failed, PaymentResult.Pending {

 record Success(String transactionId) implements PaymentResult {}
 record Failed(String reason) implements PaymentResult {}
 record Pending(String reference) implements PaymentResult {}
}
```

**ทำไมสำคัญใน Enterprise:** เปิด inheritance ไร้ขอบเขตทำให้ domain พังยากต่อการ refactor
Sealed = compile-time contract ว่า “ผลลัพธ์มีได้แค่นี้” → switch ตรวจ exhaust ได้

---

## 4. Switch Expressions

```java
String label = switch (result) {
 case PaymentResult.Success s -> "OK:" + s.transactionId();
 case PaymentResult.Failed f -> "FAIL:" + f.reason();
 case PaymentResult.Pending p -> "WAIT:" + p.reference();
};
```

ข้อดีเชิงสถาปัตย์:

- เป็น **expression** → บังคับคืนค่าทุกสาขา
- ใช้กับ sealed → ลืม case = compile error (ไม่ใช่ runtime bug)

---

## 5. Stream API & Functional Style

```java
List<OrderSummary> summaries = orders.stream()
 .filter(o -> o.status() == Status.PAID)
 .collect(Collectors.groupingBy(Order::customerId, Collectors.counting()))
 .entrySet().stream()
 .map(e -> new OrderSummary(e.getKey(), e.getValue()))
 .toList(); // unmodifiable (Java 16+)
```

### Guidelines

- Stream เหมาะกับ **transformation pipeline** ไม่ใช่ side-effect หนัก ๆ ใน `forEach`
- `toList()` คืน immutable — ดีต่อ API boundary
- ระวัง N+1 ถ้า stream เรียก lazy association ของ JPA (จะเจอใน Intermediate)

---

## 6. Collections Framework และ Memory

| Type                  | เมื่อใช้                        | Memory / Semantics                     |
| --------------------- | ------------------------------- | -------------------------------------- |
| `ArrayList`           | random access, append ท้าย      | contiguous-ish references; resize cost |
| `LinkedList`          | แทบไม่ใช้ใน production สมัยใหม่ | node overhead สูง                      |
| `HashSet`             | uniqueness, ไม่สนใจลำดับ        | hash table + load factor               |
| `LinkedHashSet`       | uniqueness + insertion order    | เพิ่ม linked pointers                  |
| `HashMap`             | key-value ทั่วไป                | reference types เท่านั้นใน generic     |
| `EnumMap` / `EnumSet` | key เป็น enum                   | compact และเร็วมาก                     |

### Reference Types และผลต่อ Memory

ใน Java **generic collection เก็บ reference ไม่ใช่ค่า primitive โดยตรง** (ยกเว้น specialized libs):

```java
List<Integer> nums = List.of(1, 2, 3); // autoboxing → Integer objects
```

ผลกระทบ:

- Autoboxing ใน hot loop = allocation + GC pressure
- Shared mutable object ในหลาย collection = aliasing bug
- `List.copyOf` / `Map.copyOf` / `Set.copyOf` สร้าง defensive immutable view — ใช้ที่ขอบเขต module

**Architectural choice:** ที่ API boundary เลือก immutable collections; ภายใน service ค่อยใช้ mutable ถ้าจำเป็นเพื่อประสิทธิภาพ

---

## 7. Exception Handling ระดับ Enterprise

### ชั้นของ Exception

```
Technical (IOException, DataAccessException)
 ↓ wrap / translate
BusinessException (domain rule ถูกฝ่าฝืน)
 ↓ map
HTTP Problem Detail / ErrorResponse (API contract)
```

### Custom Business Exception

```java
public sealed class BusinessException extends RuntimeException
 permits NotFoundException, ConflictException, ValidationBusinessException {

 private final String code;

 protected BusinessException(String code, String message) {
 super(message);
 this.code = code;
 }

 public String code() { return code; }
}
```

### Global Exception Interception (Spring)

ใช้ `@RestControllerAdvice` + `@ExceptionHandler` เพื่อ:

1. **แยก** domain error ออกจาก framework error
2. คืน **รูปแบบเดียวกัน** ทั้งระบบ (RFC 7807 Problem Details หรือ internal ErrorResponse)
3. ไม่ให้ stacktrace ไหลออก production response

**Anti-pattern:** `catch (Exception e) { return null; }` ใน service — ซ่อนสาเหตุและทำให้ debug ไม่ได้

ดูตัวอย่างเต็มที่ [`examples/03-exception-handling/`](./examples/03-exception-handling/)

---

## 8. Design Patterns ที่ใช้ในระดับนี้

| Pattern                          | ใช้ทำอะไร                                         |
| -------------------------------- | ------------------------------------------------- |
| **Value Object** (Record)        | Money, Email, OrderId ที่ validate ใน constructor |
| **Algebraic Data Type** (Sealed) | ผลลัพธ์ที่มีสถานะจำกัด                            |
| **Strategy** (functional)        | ส่ง `Function` / `Predicate` แทน if-else ยาว      |
| **Template Method** (เบา ๆ)      | pipeline ของ Stream                               |
| **Exception Translation**        | แปลง technical → business ที่ขอบเขตชั้น           |

---

## 9. Best Practices สรุป

1. ใช้ `record` สำหรับ data ที่ไม่มี identity
2. ปิด hierarchy ด้วย `sealed` เมื่อรู้ชุด subtype ล่วงหน้า
3. Prefer immutable collections ที่ขอบเขต API
4. แยก Business Exception จาก Technical Exception
5. Global handler ต้อง map status code ให้สม่ำเสมอ (404/409/422/500)
6. อย่าใช้ exception สำหรับ control flow ปกติ (เช่น “ไม่พบ” ใน loop แน่น ๆ) — แต่ใน service boundary การ throw business exception ยังเป็นที่ยอมรับใน Spring style

---

## ตัวอย่างโค้ดในระดับนี้

| folder                                                                | เนื้อหา                         |
| --------------------------------------------------------------------- | ------------------------------- |
| [`examples/01-modern-java`](./examples/01-modern-java/)               | Records, Sealed, Switch, Stream |
| [`examples/02-collections`](./examples/02-collections/)               | List/Set/Map + memory notes     |
| [`examples/03-exception-handling`](./examples/03-exception-handling/) | Spring Boot Global Handler      |

ถัดไป: อ่านแล้วรัน examples → ทำ [`LAB.md`](./LAB.md)

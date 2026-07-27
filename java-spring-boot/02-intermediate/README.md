# Level 2 — Intermediate: The Spring Ecosystem

เป้าหมายระดับนี้: ให้คุณสร้าง **Spring Boot 3 API ระดับทีมจริง** ได้
โดยเข้าใจ IoC, Bean lifecycle, JPA Entity lifecycle, DTO boundary และ REST maturity — ไม่ใช่แค่ annotate แล้วรัน

---

## สารบัญ

1. [Spring Boot 3 Essentials](#1-spring-boot-3-essentials)
2. [Dependency Injection & IoC](#2-dependency-injection--ioc)
3. [Bean Lifecycle](#3-bean-lifecycle)
4. [Spring Data JPA + Hibernate](#4-spring-data-jpa--hibernate)
5. [DTO Pattern และ Mapping](#5-dto-pattern-และ-mapping)
6. [Relationships: OneToMany / ManyToMany](#6-relationships-onetomany--manytomany)
7. [Request Validation](#7-request-validation)
8. [Secure RESTful API & Maturity Model](#8-secure-restful-api--maturity-model)
9. [Architectural Choices สรุป](#9-architectural-choices-สรุป)

---

## 1. Spring Boot 3 Essentials

Spring Boot 3 ใช้ **Jakarta EE** (`jakarta.*`) ไม่ใช่ `javax.*` และต้องการ Java 17+

| ความสามารถ           | บทบาท                        |
| -------------------- | ---------------------------- |
| Auto-configuration   | เลือก bean ตาม classpath     |
| Starter dependencies | ชุด dependency ที่เข้ากันได้ |
| Actuator (optional)  | health / metrics             |
| Externalized config  | `application.yml` + profile  |

**Architectural choice:** เริ่มจาก `spring-boot-starter-web` + `data-jpa` + `validation` ก่อน อย่าดึง starter ทั้งโลกตั้งแต่วันแรก

---

## 2. Dependency Injection & IoC

### IoC Container

คุณไม่ `new` service เอง — Spring สร้างและ inject ให้ตาม graph ของ dependencies

### รูปแบบ Injection

```java
// ✅ แนะนำ: Constructor Injection — immutable, testable, required deps ชัด
@Service
public class OrderService {
 private final OrderRepository orderRepository;

 public OrderService(OrderRepository orderRepository) {
 this.orderRepository = orderRepository;
 }
}

// ⚠️ Field @Autowired — ยากต่อ unit test, ซ่อน required deps
@Autowired
private OrderRepository orderRepository;
```

| แบบ                | ข้อดี                        | ข้อเสีย                                   |
| ------------------ | ---------------------------- | ----------------------------------------- |
| Constructor        | required deps ชัด, final ได้ | ยาวเมื่อ deps เยอะ (สัญญาณว่า class อ้วน) |
| Setter             | optional deps                | mutable, มักไม่จำเป็น                     |
| Field `@Autowired` | สั้น                         | anti-pattern ในโค้ดใหม่                   |

**Pattern:** Constructor Injection = **Explicit Dependencies** principle

ดู [`examples/01-di-ioc`](./examples/01-di-ioc/)

---

## 3. Bean Lifecycle

ลำดับสำคัญโดยย่อ:

```
instantiate → inject deps → @PostConstruct → ready → (@PreDestroy on shutdown)
```

```java
@Component
public class CacheWarmup {
 @PostConstruct
 void warm() { /* load reference data */ }

 @PreDestroy
 void cleanup() { /* close resources */ }
}
```

ใช้ lifecycle hooks สำหรับ resource ที่ Spring ยังไม่จัดการให้ — อย่าใส่ business logic หนักใน `@PostConstruct` โดยไม่มีเหตุผล

---

## 4. Spring Data JPA + Hibernate

### Entity Lifecycle

```
Transient → Persistent (persist/save) → Detached → Removed
```

สิ่งที่ทีมมักพลาด:

- แก้ entity ที่ detached แล้วคาดหวังให้ DB update เอง
- Lazy load นอก transaction → `LazyInitializationException`
- ใช้ Entity เป็น API response โดยตรง → over-fetch / circular JSON / leak internals

### Repository

```java
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
 List<OrderEntity> findByCustomerId(Long customerId);
}
```

**Choice:** Spring Data method naming สำหรับ query ง่าย; JPQL/`@Query` เมื่อ logic ซับซ้อน; Criteria/Specification เมื่อ dynamic filter

ดู [`examples/02-jpa-dto`](./examples/02-jpa-dto/)

---

## 5. DTO Pattern และ Mapping

| ชั้น              | หน้าที่                             |
| ----------------- | ----------------------------------- |
| Entity            | persistence model + ความสัมพันธ์ DB |
| Domain (optional) | business rules                      |
| DTO / Record      | API contract                        |

```java
public record OrderResponse(Long id, String status, List<ItemResponse> items) {}
```

**ทำไมแยก:**

1. เปลี่ยน schema DB โดยไม่พัง API clients
2. ควบคุม field ที่ expose (password hash, internal flags)
3. หลีกเลี่ยง Jackson ↔ Hibernate proxy issues

Mapper แบบมือ = ชัดเจนและควบคุมได้; MapStruct = ลด boilerplate เมื่อ project ใหญ่

---

## 6. Relationships: OneToMany / ManyToMany

```java
@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
private List<OrderItemEntity> items = new ArrayList<>();

@ManyToMany
@JoinTable(name = "user_roles",
 joinColumns = @JoinColumn(name = "user_id"),
 inverseJoinColumns = @JoinColumn(name = "role_id"))
private Set<RoleEntity> roles = new HashSet<>();
```

Guidelines:

- กำหนด **owning side** ให้ชัด (`mappedBy` อยู่ฝั่ง inverse)
- ระวัง `CascadeType.ALL` บน ManyToMany — มักอันตราย
- Prefer unidirectional ถ้า bidirectional ไม่จำเป็น
- ใช้ DTO ตัดวงจร JSON ไม่ใช้ `@JsonIgnore` เป็นทางออกหลัก

---

## 7. Request Validation

```java
public record CreateOrderRequest(
 @NotNull Long customerId,
 @NotEmpty @Valid List<ItemRequest> items
) {}

@PostMapping
public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) { ... }
```

| Annotation               | ความหมาย                |
| ------------------------ | ----------------------- |
| `@NotNull` / `@NotBlank` | required                |
| `@Size` / `@Email`       | format / length         |
| `@Valid` cascade         | validate nested objects |
| `@Validated` on class    | group validation        |

จับ `MethodArgumentNotValidException` ใน `@RestControllerAdvice` ให้ error shape สม่ำเสมอ

ดู [`examples/03-validation-rest`](./examples/03-validation-rest/)

---

## 8. Secure RESTful API & Maturity Model

### Richardson Maturity Model (ย่อ)

| Level | ความหมาย             | ในหลักสูตรนี้                |
| ----- | -------------------- | ---------------------------- |
| 0     | HTTP เป็นท่อ RPC     | หลีกเลี่ยง                   |
| 1     | Resources            | `/orders/{id}`               |
| 2     | HTTP verbs + status  | GET/POST/PATCH + 201/404/409 |
| 3     | Hypermedia (HATEOAS) | optional — ยังไม่บังคับ      |

### Secure REST basics (Intermediate)

- ใช้ HTTPS ใน production
- อย่าใส่ secrets ใน URL
- Validate ทุก input
- ใช้ status code ให้ตรงความหมาย
- เตรียม authn/authz ไว้ต่อ Expert (อย่า hardcode role ใน controller แบบกระจัดกระจาย)

---

## 9. Architectural Choices สรุป

1. **Constructor Injection only** สำหรับ required dependencies
2. **Entity อยู่ persistence layer** — API คุยด้วย DTO/Record
3. **Transaction ที่ service** (`@Transactional`) ไม่ใช่ controller
4. **Validation ที่ขอบเขต API** + business rule ที่ service
5. **REST Level 2 เป็นมาตรฐานขั้นต่ำ** ของทีม

---

## ตัวอย่างโค้ดในระดับนี้

| folder                                                          | เนื้อหา                          |
| --------------------------------------------------------------- | -------------------------------- |
| [`examples/01-di-ioc`](./examples/01-di-ioc/)                   | Constructor DI, IoC, lifecycle   |
| [`examples/02-jpa-dto`](./examples/02-jpa-dto/)                 | JPA relations + DTO mapping (H2) |
| [`examples/03-validation-rest`](./examples/03-validation-rest/) | `@Valid` + REST conventions      |

ถัดไป: [`LAB.md`](./LAB.md) — Order Management API

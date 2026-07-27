# Level 3 — Expert: Enterprise Security, Architecture & Scale

ระดับนี้เปลี่ยนคุณจาก "เขียน Spring API ได้" เป็น "ออกแบบระบบ Enterprise ที่ปลอดภัย ขยายได้ และดูแลระยะยาวได้"

---

## สารบัญ

1. [Spring Security & OAuth2 / Keycloak Simulation](#1-spring-security--oauth2--keycloak-simulation)
2. [RBAC และ Method Security](#2-rbac-และ-method-security)
3. [Multi-tenancy Architecture](#3-multi-tenancy-architecture)
4. [Transactional Boundaries](#4-transactional-boundaries)
5. [Audit Logging](#5-audit-logging)
6. [Asynchronous Workloads (`@Async`)](#6-asynchronous-workloads-async)
7. [Excel Data Exporter (Apache POI)](#7-excel-data-exporter-apache-poi)
8. [DDD & Hexagonal Architecture](#8-ddd--hexagonal-architecture)
9. [Anti-Patterns และ Best Practices](#9-anti-patterns-และ-best-practices)

---

## 1. Spring Security & OAuth2 / Keycloak Simulation

ในองค์กรจริง Identity Provider มักเป็น **Keycloak / Okta / Entra ID**
แอป Spring เป็น **OAuth2 Resource Server** ที่ verify JWT ไม่เก็บ password เอง

```
Client → Keycloak (token) → API (Resource Server) → Authorization (roles/scopes)
```

หลักสูตรนี้จำลอง Keycloak โดย:

- ออก JWT (HS256) พร้อม claim บทบาทแบบ Keycloak: `realm_access.roles`
- ตั้ง `JwtAuthenticationConverter` แปลง roles → `ROLE_*` authorities
- ใช้ `spring-boot-starter-oauth2-resource-server`

**Architectural choice:** แยก Authentication (ใคร) ออกจาก Authorization (ทำอะไรได้)
อย่า hardcode user store ในทุก microservice ถ้าองค์กรมี IdP กลางแล้ว

ดู [`examples/01-security-rbac`](./examples/01-security-rbac/)

---

## 2. RBAC และ Method Security

### Layered authorization

| ชั้น                       | กลไก                           | ใช้เมื่อ               |
| -------------------------- | ------------------------------ | ---------------------- |
| HTTP Security Filter Chain | `requestMatchers(...).hasRole` | ปกป้อง URL หยาบ ๆ      |
| Method Security            | `@PreAuthorize`                | กฎละเอียดตาม business  |
| Domain policy              | invariant ใน aggregate         | กฎที่ไม่เกี่ยวกับ HTTP |

```java
@PreAuthorize("hasRole('ADMIN') or @orderSecurity.canView(authentication, #id)")
@GetMapping("/orders/{id}")
public OrderResponse get(@PathVariable Long id) { ... }
```

เปิดด้วย:

```java
@EnableMethodSecurity
```

**Choice:** URL rules = coarse gate; `@PreAuthorize` = fine-grained; domain checks = last line of defense

---

## 3. Multi-tenancy Architecture

| แบบ                             | แนวคิด      | ข้อดี            | ข้อเสีย                        |
| ------------------------------- | ----------- | ---------------- | ------------------------------ |
| **Discriminator** (`tenant_id`) | แชร์ schema | ง่าย, ประหยัด    | เสี่ยง data leak ถ้าลืม filter |
| **Schema-per-tenant**           | คนละ schema | แยกชัด           | migration ซับซ้อน              |
| **Database-per-tenant**         | คนละ DB     | isolation สูงสุด | ops แพง                        |

สำหรับหลักสูตรใช้ **Discriminator + TenantContext (ThreadLocal)** ผ่าน filter จาก JWT claim `tenant_id`

```java
public final class TenantContext {
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();
    public static void set(String tenantId) { CURRENT.set(tenantId); }
    public static String get() { return CURRENT.get(); }
    public static void clear() { CURRENT.remove(); }
}
```

**สำคัญ:** ต้อง `clear()` ใน `finally` ทุก request — ไม่งั้น thread pool จะปน tenant

ดู [`examples/02-multitenancy-tx`](./examples/02-multitenancy-tx/)

---

## 4. Transactional Boundaries

กฎทอง:

1. `@Transactional` อยู่ที่ **application/service** ไม่ใช่ controller
2. `readOnly = true` สำหรับ query เพื่อ optimization hint
3. อย่าเรียก self-invocation ผ่าน `this` แล้วคาดหวัง proxy transaction ทำงาน
4. กำหนด rollback สำหรับ checked exceptions ถ้าจำเป็น (`rollbackFor`)
5. Transaction ควรสั้น — งานหนัก (Excel, email, AI) อย่าขัง connection ไว้

```java
@Transactional
public OrderId placeOrder(PlaceOrderCommand cmd) {
    // load aggregates → business rules → persist
}
```

---

## 5. Audit Logging

Enterprise ต้องการรู้ว่า **ใคร ทำอะไร เมื่อไหร่ กับทรัพยากรใด**

แนวทาง:

- Aspect (`@Aspect`) รอบ method ที่ annotate `@Audited`
- หรือ Entity listeners / Spring Data auditing (`@CreatedBy`)
- เก็บ actor จาก `SecurityContext`

อย่า log PII/sensitive ดิบ ๆ โดยไม่มี policy

---

## 6. Asynchronous Workloads (`@Async`)

ใช้เมื่องาน:

- ใช้เวลานาน (export, notification fan-out)
- ไม่จำเป็นต้องอยู่ใน request/response เดียวกัน

```java
@EnableAsync
@Configuration
public class AsyncConfig implements AsyncConfigurer {
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(4);
        exec.setMaxPoolSize(16);
        exec.setQueueCapacity(500);
        exec.setThreadNamePrefix("async-");
        exec.initialize();
        return exec;
    }
}
```

**ระวัง:** SecurityContext / TenantContext ไม่ได้ propagate อัตโนมัติเสมอ — ต้องออกแบบ TaskDecorator

---

## 7. Excel Data Exporter (Apache POI)

สำหรับข้อมูลใหญ่ใช้ **SXSSFWorkbook** (streaming) ไม่ใช่ XSSF ทั้งก้อนใน memory

แนวทาง stylized export:

- Header style (bold, freeze pane)
- Date / currency formats
- Auto-size อย่างระวัง (แพง) — กำหนด column width ตายตัวดีกว่าใน batch ใหญ่
- เขียนลง `OutputStream` ของ HTTP response หรือไฟล์ชั่วคราวแล้ว upload object storage

ดู [`examples/03-async-audit-excel`](./examples/03-async-audit-excel/)

---

## 8. DDD & Hexagonal Architecture

### Hexagonal (Ports & Adapters)

```
  ┌──────────────┐
 HTTP ──► │ In Adapter │
  └──────┬───────┘
   ▼
  ┌──────────────┐
  │ Application │ (use cases)
  └──────┬───────┘
   ▼
  ┌──────────────┐
  │ Domain │ (models, policies)
  └──────┬───────┘
   ▼
  ┌──────────────┐
  │ Out Ports │ ◄── Persistence / Mail / IdP adapters
  └──────────────┘
```

กฎ:

- Domain **ไม่ import** Spring / JPA / Servlet
- Application พึ่งพา interfaces (ports)
- Adapters implement ports

### DDD แบบปฏิบัติ (ไม่ต้องศักดิ์สิทธิ์เกินเหตุ)

| Building block  | ตัวอย่าง                                          |
| --------------- | ------------------------------------------------- |
| Entity          | `Order` มี identity                               |
| Value Object    | `Money`, `TenantId`                               |
| Aggregate       | `Order` + items                                   |
| Domain Event    | `OrderPlaced`                                     |
| Repository port | `OrderRepository` interface ใน domain/application |

ดู [`examples/04-hexagonal-ddd`](./examples/04-hexagonal-ddd/)

---

## 9. Anti-Patterns และ Best Practices

| หลีกเลี่ยง                                     | ทำแทน                                 |
| ---------------------------------------------- | ------------------------------------- |
| Entity เป็น API response                       | DTO / response model                  |
| God `@Service` 2,000 บรรทัด                    | แยก use case ตาม capability           |
| เปิด `@Transactional` ทั้ง class แบบสะเปะสะปะ  | ขอบเขตสั้น ชัดเจน                     |
| เชื่อ URL security อย่างเดียว                  | เสริม `@PreAuthorize` + domain checks |
| Export Excel ใน request thread โดยไม่จำกัดขนาด | `@Async` + job status + streaming POI |
| Domain พึ่ง Spring                             | Hexagonal ports                       |

---

## ตัวอย่างโค้ดในระดับนี้

| folder                                                              | เนื้อหา                                      |
| ------------------------------------------------------------------- | -------------------------------------------- |
| [`examples/01-security-rbac`](./examples/01-security-rbac/)         | JWT Resource Server + RBAC + `@PreAuthorize` |
| [`examples/02-multitenancy-tx`](./examples/02-multitenancy-tx/)     | Tenant discriminator + `@Transactional`      |
| [`examples/03-async-audit-excel`](./examples/03-async-audit-excel/) | Audit + `@Async` + POI exporter              |
| [`examples/04-hexagonal-ddd`](./examples/04-hexagonal-ddd/)         | Hexagonal order use case                     |

ถัดไป: [`LAB.md`](./LAB.md) — Enterprise Tenant Order Platform

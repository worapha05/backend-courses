# Java Enterprise Bootcamp — Zero to Expert

bootcamp เรียนรู้ **Java 17/21 + Spring Boot 3** แบบครบวงจรสำหรับนักพัฒนาที่มุ่งสู่ระดับ Enterprise
จาก Modern Java → Spring Ecosystem → Security, Scale และ Architecture ระดับ Production

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- เขียน Java สมัยใหม่ด้วย Records, Sealed Classes, Switch Expressions และ Stream API
- ออกแบบ Exception Handling แบบ Global + Custom Business Exception
- เข้าใจ IoC, Dependency Injection และ Bean Lifecycle ของ Spring
- สร้าง RESTful API ที่ปลอดภัยด้วย Spring Data JPA, DTO และ Bean Validation
- ทำ RBAC ด้วย Spring Security / OAuth2 (จำลอง Keycloak)
- ออกแบบ Multi-tenancy, `@Transactional`, Audit, `@Async` และ Excel Export
- จัดโครงสร้างแอปด้วย **DDD / Hexagonal Architecture**

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                                     | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | ---------------------------------------------- | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | Modern Java, Collections, Exception Handling   | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | DI/IoC, Spring Data JPA, Validation, REST      | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | Security/RBAC, Multi-tenancy, Async, Hexagonal | 2–4 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย เน้น Design Patterns และ Architectural Choices
2. **`examples/`** — โค้ดตัวอย่าง Spring Boot 3 / Java ที่รันได้จริง
3. **`LAB.md`** — โจทย์ Enterprise พร้อมเฉลยเต็มใน `lab/solution/`

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐาน OOP (class, interface, inheritance)
- เคยพัฒนา Web/API มาบ้าง (ภาษาใดก็ได้)
- ติดตั้ง [JDK 21](https://adoptium.net/) (รองรับ 17+)
- ติดตั้ง [Maven 3.9+](https://maven.apache.org/)
- (ระดับ Intermediate+) Docker สำหรับ PostgreSQL / (Expert) Keycloak จำลองด้วย JWT stub

```bash
java -version # ควรเป็น 21.x หรือ 17.x
mvn -version
```

```bash
# PostgreSQL สำหรับ Intermediate+
docker run --name java-bootcamp-pg \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=bootcamp \
  -p 5432:5432 -d postgres:16
```

---

## วิธีใช้ Bootcamp

1. อ่าน `README.md` ของระดับนั้นให้จบก่อน — โฟกัสที่ **ทำไมเลือก pattern นี้**
2. เปิด `examples/` แล้วรันทีละ project
3. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลย
4. ไประดับถัดไปเมื่ออธิบาย design choice ของตนเองได้

```bash
# Beginner — Modern Java
cd java-enterprise-bootcamp/01-beginner/examples/01-modern-java
mvn -q compile exec:java

# Intermediate — DI / IoC
cd java-enterprise-bootcamp/02-intermediate/examples/01-di-ioc
mvn -q spring-boot:run

# Expert — Hexagonal
cd java-enterprise-bootcamp/03-expert/examples/04-hexagonal-ddd
mvn -q spring-boot:run
```

---

## Learning Path ที่แนะนำ

```
Beginner: Modern Java + Collections + Exceptions
 ↓
Intermediate: Spring Boot 3 + JPA + Validated REST
 ↓
Expert: Security + Multi-tenancy + Async + Hexagonal/DDD
 ↓
project จริงของคุณเอง (Enterprise API Portfolio)
```

---

## หลักการสำคัญที่หลักสูตรย้ำตลอด

| หลักการ                      | ความหมายใน Java / Spring                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| Prefer Constructor Injection | ชัดเจน, testable, immutable dependencies                                  |
| Entity ≠ DTO                 | อย่าเปิด domain model ตรงออก API                                          |
| Fail fast, map clearly       | Business exception → HTTP mapping ที่สม่ำเสมอ                             |
| Transactional boundaries     | `@Transactional` อยู่ที่ application/service ไม่ใช่ repository อย่างเดียว |
| Security by design           | RBAC + method security ไม่ใช่แค่ filter ชั้นนอก                           |
| Ports & Adapters             | Domain ไม่รู้จัก Spring / JPA / HTTP                                      |

---

## Tech Stack มาตรฐานของหลักสูตร

| ชั้น          | เทคโนโลยี                                  |
| ------------- | ------------------------------------------ |
| Language      | Java 21 (compatible 17)                    |
| Framework     | Spring Boot 3.3.x                          |
| Persistence   | Spring Data JPA + Hibernate                |
| Validation    | Jakarta Bean Validation                    |
| Security      | Spring Security 6 + OAuth2 Resource Server |
| Docs / Export | Apache POI                                 |
| Build         | Maven                                      |

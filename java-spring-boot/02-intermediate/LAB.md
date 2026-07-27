# Lab — Intermediate: Order Management API

## เป้าหมาย

สร้าง **Order Management API** ด้วย Spring Boot 3 + Spring Data JPA
ฝึก DI, Entity relationships, DTO, `@Valid` และ REST maturity level 2

## โจทย์

| Method  | Path                  | คำอธิบาย                      |
| ------- | --------------------- | ----------------------------- |
| `GET`   | `/health`             | health check                  |
| `POST`  | `/customers`          | สร้างลูกค้า                   |
| `GET`   | `/customers/{id}`     | ดึงลูกค้า                     |
| `POST`  | `/products`           | สร้างสินค้า                   |
| `GET`   | `/products`           | รายการสินค้า                  |
| `POST`  | `/orders`             | สร้างออเดอร์พร้อมรายการสินค้า |
| `GET`   | `/orders/{id}`        | ดึงออเดอร์ + items            |
| `PATCH` | `/orders/{id}/status` | เปลี่ยนสถานะออเดอร์           |

### Domain โดยย่อ

- `Customer` 1 — N `Order`
- `Order` 1 — N `OrderItem`
- `Product` ถูกอ้างใน `OrderItem` (Many items → One product)
- สถานะออเดอร์: `PENDING` → `PAID` → `SHIPPED` → `CANCELLED` (ยกเลิกได้จาก PENDING/PAID)

### ข้อกำหนดบังคับ

1. Constructor Injection เท่านั้น (ห้าม field `@Autowired`)
2. Entity ไม่ถูกส่งออก API โดยตรง — ใช้ DTO/Record
3. `@OneToMany` บน Order ↔ OrderItem พร้อม `orphanRemoval`
4. `@Valid` บน request bodies
5. Global exception handler (404/400/409)
6. ใช้ H2 in-memory หรือ PostgreSQL ก็ได้ (เฉลยใช้ H2)
7. `@Transactional` บน service ที่สร้างออเดอร์
8. สร้างออเดอร์แล้วคำนวณ `totalAmount` จากราคา product × qty

### ตัวอย่าง Payload

```json
POST /orders
{
 "customerId": 1,
 "items": [
 { "productId": 1, "quantity": 2 },
 { "productId": 3, "quantity": 1 }
 ]
}
```

```json
PATCH /orders/1/status
{ "status": "PAID" }
```

## เกณฑ์ผ่าน

- [ ] CRUD/flows ตามตารางทำงาน
- [ ] DTO boundary ชัดเจน
- [ ] Relationship mapping ถูกต้อง
- [ ] Validation และ error shape สม่ำเสมอ
- [ ] Transition สถานะผิดกฎ = 409 หรือ 422

## คำใบ้

- เก็บ `unitPrice` snapshot ใน OrderItem ตอนสร้าง (ราคาเปลี่ยนทีหลังไม่กระทบออเดอร์เก่า)
- ใช้ enum `OrderStatus`
- `findById` + `orElseThrow(NotFoundException)`

## วิธีเริ่มต้น

ใช้ project เริ่มต้นที่ [`lab/starter/`](./lab/starter/) แล้วเติมโค้ดตามโจทย์

```bash
cd lab/starter
mvn spring-boot:run
```

## เฉลย

[`lab/solution/`](./lab/solution/)

```bash
cd lab/solution
mvn spring-boot:run
```

# Lab — Beginner: Catalog Pricing Engine

## เป้าหมาย

สร้าง **Catalog Pricing Engine** ด้วย Java 21 (ยังไม่ต้องใช้ JPA)
ฝึก Records, Sealed Types, Stream API, Collections และ Business Exception + Global Handler บน Spring Boot 3

## โจทย์

สร้าง REST API สำหรับจัดการสินค้าและคำนวณราคา:

| Method | Path              | คำอธิบาย                           |
| ------ | ----------------- | ---------------------------------- |
| `GET`  | `/health`         | `{"status":"UP"}`                  |
| `GET`  | `/products`       | รายการสินค้าทั้งหมด                |
| `GET`  | `/products/{sku}` | ดึงสินค้าตาม SKU — ไม่เจอ = 404    |
| `POST` | `/products`       | สร้างสินค้า                        |
| `POST` | `/quotes`         | คำนวณใบเสนอราคาจากรายการ SKU + qty |

### โครงข้อมูล Product

```json
{
  "sku": "NB-001",
  "name": "Notebook Pro 14",
  "category": "ELECTRONICS",
  "basePrice": 45900.0,
  "currency": "THB"
}
```

### โครง Quote Request / Response

```json
// POST /quotes
{
  "customerType": "VIP",
  "lines": [
    { "sku": "NB-001", "quantity": 2 },
    { "sku": "MS-010", "quantity": 1 }
  ]
}
```

```json
// response
{
  "currency": "THB",
  "subtotal": 92800.0,
  "discount": 9280.0,
  "total": 83520.0,
  "lines": [
    {
      "sku": "NB-001",
      "quantity": 2,
      "unitPrice": 45900.0,
      "lineTotal": 91800.0
    }
  ]
}
```

### ข้อกำหนดบังคับ

1. ใช้ **`record`** สำหรับ Product, QuoteLine, QuoteResult
2. ใช้ **`sealed interface`** สำหรับ `DiscountPolicy` (อย่างน้อย `NoDiscount`, `VipDiscount`, `BulkDiscount`)
3. คำนวณด้วย **Stream API** (ห้ามวน for แบบสะสมยอดอย่างเดียวทั้ง function — อนุญาตผสมได้ถ้าจำเป็น)
4. มี `BusinessException` hierarchy + `@RestControllerAdvice`
5. `POST /products` validate: sku/name ไม่ว่าง, basePrice >= 0
6. SKU ซ้ำ = `409 Conflict`
7. Quote อ้าง SKU ที่ไม่มี = `404` พร้อม error code ชัดเจน
8. เก็บสินค้าใน memory (`ConcurrentHashMap`) ผ่าน interface `ProductRepository`

### กติกาส่วนลด

| customerType | เงื่อนไข                        | ส่วนลด           |
| ------------ | ------------------------------- | ---------------- |
| `REGULAR`    | —                               | 0%               |
| `VIP`        | —                               | 10% ของ subtotal |
| `BULK`       | ถ้า quantity รวมทุกบรรทัด >= 10 | 15% ของ subtotal |
| `BULK`       | quantity รวม < 10               | 0%               |

### ตัวอย่าง Request

```bash
curl -s -X POST http://localhost:8080/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"NB-001","name":"Notebook Pro 14","category":"ELECTRONICS","basePrice":45900,"currency":"THB"}'

curl -s -X POST http://localhost:8080/quotes \
  -H 'Content-Type: application/json' \
  -d '{"customerType":"VIP","lines":[{"sku":"NB-001","quantity":2}]}'
```

## เกณฑ์ผ่าน

- [ ] ทุก endpoint ทำงานตามตาราง
- [ ] ใช้ record + sealed ตามข้อกำหนด
- [ ] Error response รูปแบบเดียวกันทั้งระบบ
- [ ] Repository แยกจาก controller ผ่าน interface

## คำใบ้

- `BigDecimal` สำหรับเงิน — อย่าใช้ `double`
- Map SKU → Product ด้วย `ConcurrentHashMap`
- Switch expression บน sealed discount policy

## วิธีเริ่มต้น

ใช้ project เริ่มต้นที่ [`lab/starter/`](./lab/starter/) แล้วเติมโค้ดตามโจทย์

```bash
cd lab/starter
mvn spring-boot:run
```

## เฉลย

ดูโค้ดเต็มที่ [`lab/solution/`](./lab/solution/)

```bash
cd lab/solution
mvn spring-boot:run
```

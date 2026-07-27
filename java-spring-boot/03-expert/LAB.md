# Lab — Expert: Enterprise Tenant Order Platform

## เป้าหมาย

สร้าง platform ระดับ Enterprise ขนาดย่อมที่รวม:

- JWT RBAC (จำลอง Keycloak roles)
- Multi-tenancy แบบ discriminator
- Hexagonal / use-case structure
- Audit log
- `@Async` Excel export ด้วย Apache POI

## โจทย์

| Method | Path                        | Role           | คำอธิบาย                         |
| ------ | --------------------------- | -------------- | -------------------------------- |
| `GET`  | `/api/health`               | public         | health                           |
| `POST` | `/api/orders`               | `ORDER_WRITE`  | สร้างออเดอร์ใน tenant ปัจจุบัน   |
| `GET`  | `/api/orders/{id}`          | `ORDER_READ`   | ดึงออเดอร์ (เฉพาะ tenant ตนเอง)  |
| `GET`  | `/api/orders`               | `ORDER_READ`   | รายการออเดอร์ของ tenant          |
| `POST` | `/api/exports/orders`       | `ORDER_EXPORT` | เริ่ม job export Excel แบบ async |
| `GET`  | `/api/exports/{jobId}`      | `ORDER_EXPORT` | สถานะ job / linkdownload         |
| `GET`  | `/api/exports/{jobId}/file` | `ORDER_EXPORT` | download ไฟล์                    |
| `GET`  | `/api/admin/audit`          | `ADMIN`        | ดู audit entries                 |

### ข้อกำหนดบังคับ

1. JWT ต้องมี claims: `sub`, `tenant_id`, `realm_access.roles`
2. Roles อย่างน้อย: `ORDER_READ`, `ORDER_WRITE`, `ORDER_EXPORT`, `ADMIN`
3. Tenant isolation: ผู้ใช้ tenant A ห้ามเห็นออเดอร์ tenant B
4. Domain/application แยกจาก web/persistence adapters
5. `@PreAuthorize` บน use case หรือ controller
6. Export ใช้ SXSSF (streaming) + header style
7. ทุกคำสั่งสร้างออเดอร์/export ต้องมี audit record
8. ใช้ H2 ได้ (เฉลยใช้ H2)

### จำลอง Token (แนวทาง)

เฉลยมี `DemoTokenController` (profile `dev`) หรือ utility class ออก JWT ด้วย secret เดียวกับ Resource Server

```bash
# ตัวอย่างหลังได้ token
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/orders
```

## เกณฑ์ผ่าน

- [ ] RBAC ทำงานตามตาราง
- [ ] Cross-tenant access ถูกบล็อก
- [ ] Export async เสร็จแล้ว download `.xlsx` ได้
- [ ] Audit บันทึก actor + action + resource
- [ ] โครงสร้างใกล้ Hexagonal (domain ไม่รู้จัก Spring Web)

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

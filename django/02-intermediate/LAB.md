# Lab ระดับ Intermediate — Product Catalog API (JWT)

## เป้าหมาย

สร้าง Headless API สำหรับแคตตาล็อกสินค้าด้วย DRF ครบ:
Serializers + ViewSets + JWT + CORS

ทำเองก่อน แล้วเทียบ [`lab/solution/`](./lab/solution/)

---

## โจทย์

### Models

- **Category**: `name` (unique), `slug`
- **Product**: FK Category, `name`, `sku` (unique), `price`, `stock`, `is_published`

### API Endpoints

| Method           | Path                  | Auth                         | หมายเหตุ                                 |
| ---------------- | --------------------- | ---------------------------- | ---------------------------------------- |
| GET              | `/api/categories/`    | public                       | list                                     |
| POST             | `/api/categories/`    | JWT                          | staff เท่านั้น (IsAdminUser หรือ custom) |
| GET/POST         | `/api/products/`      | GET public, POST JWT         | ViewSet                                  |
| GET/PATCH/DELETE | `/api/products/{id}/` | GET public, แก้/ลบ JWT+staff |                                          |
| POST             | `/api/token/`         | —                            | Simple JWT obtain                        |
| POST             | `/api/token/refresh/` | —                            | refresh                                  |
| GET              | `/api/me/`            | JWT                          | ข้อมูล user                              |

### Serializer Rules

1. `price > 0`
2. `stock >= 0`
3. `sku` แปลงเป็น uppercase
4. list สาธารณะคืนเฉพาะ `is_published=True` (staff เห็นทั้งหมด)

### CORS

อนุญาต `http://localhost:5173` และ `http://localhost:3000`

---

## เกณฑ์ผ่าน

- [ ] ใช้ `DefaultRouter` สำหรับ products
- [ ] JWT ทำงาน (access + refresh)
- [ ] validation ใน serializer ครบ
- [ ] แยก settings `base` / `local`
- [ ] อธิบายความต่าง Authentication vs Permission ได้

เฉลย: [`lab/solution/`](./lab/solution/)

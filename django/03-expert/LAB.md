# Lab ระดับ Expert — Enterprise Order Desk (RBAC + Export)

## เป้าหมาย

รวมทุกอย่างของระดับ Expert เป็นระบบ **Order Desk API**:

1. ORM ที่ไม่มี N+1 (`select_related` / `prefetch_related` + aggregations)
2. Custom RBAC permissions (`viewer` / `analyst` / `ops` / `admin`)
3. Celery task สำหรับ export CSV/XLSX
4. Management command ingest ออเดอร์จาก CSV แบบ bulk

ทำเองก่อน แล้วเทียบ [`lab/solution/`](./lab/solution/)

---

## Domain Models

### `User` (custom)

- field `role`: `viewer` | `analyst` | `ops` | `admin`

### `Customer`

- `name`, `email` (unique), `segment` (retail/wholesale)

### `Order`

- FK `customer`
- `code` (unique), `status` (draft/paid/shipped/cancelled)
- `total`, `created_at`

### `OrderLine`

- FK `order`, `sku`, `qty`, `unit_price`

### `ExportJob`

- `format` (csv/xlsx), `status`, `file_path`, `row_count`, `requested_by`, timestamps

---

## API Requirements

| Endpoint             | Method | Role     | พฤติกรรม                                 |
| -------------------- | ------ | -------- | ---------------------------------------- |
| `/api/orders/`       | GET    | viewer+  | list พร้อม customer + lines (optimized)  |
| `/api/orders/stats/` | GET    | analyst+ | aggregate: count by status, revenue paid |
| `/api/exports/`      | POST   | ops+     | สร้าง ExportJob + enqueue Celery         |
| `/api/exports/{id}/` | GET    | ops+     | สถานะ job                                |
| `/api/token/`        | POST   | —        | JWT                                      |

### Permission matrix

| Role    | อ่าน orders | stats | สร้าง export |
| ------- | ----------- | ----- | ------------ |
| viewer  | ✅          | ❌    | ❌           |
| analyst | ✅          | ✅    | ❌           |
| ops     | ✅          | ✅    | ✅           |
| admin   | ✅          | ✅    | ✅           |

---

## Export Rules

- ใช้ `QuerySet.iterator(chunk_size=2000)`
- Excel ใช้ `openpyxl.Workbook(write_only=True)`
- API ตอบ **202** พร้อม job id — ห้าม generate ไฟล์ใน request thread

---

## Ingestion Command

```bash
python manage.py ingest_orders path/to/orders.csv --batch-size 1000
```

CSV columns: `code,customer_email,customer_name,status,total,sku,qty,unit_price`

- `bulk_create` customers ที่ยังไม่มี
- สร้าง Order + OrderLine เป็น batch
- รายงานจำนวนแถวที่สำเร็จ / ข้าม

---

## เกณฑ์ผ่าน

- [ ] `/api/orders/` ใช้ `select_related` + `prefetch_related` (พิสูจน์ด้วย query count หรือ debug)
- [ ] RBAC ทำงานตามตาราง
- [ ] Export ผ่าน Celery และไฟล์โผล่ใน `EXPORT_DIR`
- [ ] `ingest_orders` รับ CSV จริงได้
- [ ] settings แยก `base` / `local`

เฉลยเต็ม: [`lab/solution/`](./lab/solution/)

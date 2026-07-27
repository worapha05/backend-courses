# Level 3 — Expert: Enterprise Data Handling & Performance

เป้าหมายระดับนี้: ยกระดับ DRF API ให้ทนโหลดจริง —
แก้ **N+1**, สร้าง **RBAC permissions**, รันงานหนักด้วย **Celery/Redis**, และสร้าง **Excel/CSV exporter** สำหรับตารางขนาดใหญ่

---

## สารบัญ

1. [ORM Optimization — N+1](#1-orm-optimization--n1)
2. [`select_related` vs `prefetch_related`](#2-select_related-vs-prefetch_related)
3. [Aggregations ที่ซับซ้อน](#3-aggregations-ที่ซับซ้อน)
4. [Custom DRF Permissions (RBAC)](#4-custom-drf-permissions-rbac)
5. [Celery + Redis — Background Tasks](#5-celery--redis--background-tasks)
6. [Management Commands สำหรับ Data Ingestion](#6-management-commands-สำหรับ-data-ingestion)
7. [Excel / CSV Exporter ขนาดใหญ่](#7-excel--csv-exporter-ขนาดใหญ่)
8. [Best Practices สรุป](#8-best-practices-สรุป)

---

## 1. ORM Optimization — N+1

ปัญหา classic:

```python
# BAD — 1 query ดึง orders + N queries ดึง customer ทีละใบ
for order in Order.objects.all():
 print(order.customer.name) # query ใหม่ทุก loop
```

```
Orders query: SELECT * FROM order
Loop #1: SELECT * FROM customer WHERE id=1
Loop #2: SELECT * FROM customer WHERE id=2
...  (= N+1 queries)
```

เปิด debug:

```python
# settings/local.py
LOGGING = {
 "version": 1,
 "handlers": {"console": {"class": "logging.StreamHandler"}},
 "loggers": {"django.db.backends": {"handlers": ["console"], "level": "DEBUG"}},
}
```

หรือใช้ `django-debug-toolbar` / `connection.queries`

ดูตัวอย่าง: [`examples/01-orm-optimization/`](./examples/01-orm-optimization/)

---

## 2. `select_related` vs `prefetch_related`

| Method             | Relationship     | กลไก                       |
| ------------------ | ---------------- | -------------------------- |
| `select_related`   | FK / OneToOne    | SQL JOIN ใน query เดียว    |
| `prefetch_related` | M2M / reverse FK | query แยก + join ใน Python |

```python
# FK → select_related
Order.objects.select_related("customer", "customer__profile")

# reverse FK / M2M → prefetch_related
Customer.objects.prefetch_related("orders", "orders__items")

# Prefetch object — ควบคุม queryset ย่อย
from django.db.models import Prefetch
Customer.objects.prefetch_related(
 Prefetch("orders", queryset=Order.objects.filter(status="paid"))
)
```

กฎง่าย ๆ:

- **ไปข้างหน้าตาม FK** → `select_related`
- **ย้อนกลับ / หลายแถว** → `prefetch_related`

---

## 3. Aggregations ที่ซับซ้อน

```python
from django.db.models import Count, Sum, Avg, F, Q, DecimalField
from django.db.models.functions import Coalesce

Customer.objects.annotate(
 order_count=Count("orders"),
 revenue=Coalesce(Sum("orders__total", filter=Q(orders__status="paid")), 0,
   output_field=DecimalField()),
).filter(order_count__gte=1).order_by("-revenue")
```

เทคนิค:

- `annotate` = คำนวณต่อแถว (คง QuerySet ไว้)
- `aggregate` = สรุปทั้งชุดเป็น dict เดียว
- ใช้ `filter=` ใน aggregate (Django 2.0+) แทน subquery มือเมื่อทำได้

---

## 4. Custom DRF Permissions (RBAC)

RBAC = Role-Based Access Control — สิทธิ์ผูกกับบทบาท ไม่ใช่แค่ `is_staff`

```python
from rest_framework.permissions import BasePermission

class HasRole(BasePermission):
 required_roles: set[str] = set()

 def has_permission(self, request, view):
 user = request.user
 if not user or not user.is_authenticated:
  return False
 roles = set(user.groups.values_list("name", flat=True))
 if getattr(user, "role", None):
  roles.add(user.role)
 return bool(self.required_roles & roles)

class IsManager(HasRole):
 required_roles = {"manager", "admin"}
```

```python
class ReportViewSet(viewsets.ReadOnlyModelViewSet):
 permission_classes = [IsManager]
```

แยกชั้น:

1. **Authentication** — ยืนยันตัวตน (JWT)
2. **Permission** — ตรวจ role/object
3. **Queryset scoping** — กรองข้อมูลตาม tenant/owner

ดูตัวอย่าง: [`examples/02-rbac-permissions/`](./examples/02-rbac-permissions/)

---

## 5. Celery + Redis — Background Tasks

งานที่ห้ามทำใน request cycle:

- ส่งอีเมลจำนวนมาก
- export ไฟล์ใหญ่
- ingest CSV หลักแสนแถว
- เรียก third-party ที่ช้า

```
HTTP Request ──► API enqueue task ──► Redis ──► Celery Worker
   │
   └── response 202 Accepted (job id)
```

```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

```python
@shared_task
def export_orders_task(job_id: int) -> str:
 ...
```

ดูตัวอย่าง: [`examples/03-celery-export/`](./examples/03-celery-export/)

---

## 6. Management Commands สำหรับ Data Ingestion

```python
# app/management/commands/ingest_orders.py
from django.core.management.base import BaseCommand

class Command(BaseCommand):
 def add_arguments(self, parser):
 parser.add_argument("csv_path")
 parser.add_argument("--batch-size", type=int, default=1000)

 def handle(self, *args, **options):
 # อ่านเป็น batch → bulk_create → รายงาน progress
 ...
```

แนวทางประสิทธิภาพ:

- `bulk_create` / `bulk_update` แทน save ทีละแถว
- ปิด signals ถ้าไม่จำเป็นระหว่าง ingest
- ใช้ transaction ต่อ batch ไม่ใช่ทั้งไฟล์ถ้าไฟล์ใหญ่

---

## 7. Excel / CSV Exporter ขนาดใหญ่

**อย่า** `list(qs)` ทั้งก้อนแล้วเขียนไฟล์ใน memory

```python
import csv
from django.http import StreamingHttpResponse

def stream_csv(queryset):
 def row_iter():
 header = ["id", "total", "customer"]
 yield header
 for order in queryset.iterator(chunk_size=2000):
  yield [order.id, order.total, order.customer_id]
 # หรือเขียนไฟล์บน disk แล้วให้ Celery update ExportJob
```

Excel (`openpyxl`):

- ใช้ `write_only=True` workbook
- หรือ export CSV ก่อนแล้วแปลงเมื่อจำเป็น
- สำหรับไฟล์ใหญ่ → Celery + เก็บ path ใน `ExportJob`

---

## 8. Best Practices สรุป

| หลักการ                     | ทำ                                |
| --------------------------- | --------------------------------- |
| Measure queries             | อย่า optimize มั่วโดยไม่นับ query |
| Permission แยกจาก Auth      | RBAC class ชัดเจน                 |
| Heavy work → queue          | Celery + idempotent tasks         |
| Stream / chunk export       | `iterator()`, write_only, batch   |
| Commands เป็นเครื่องมือ ops | ingest/repair/backfill มี logging |

---

## ตัวอย่างในระดับนี้

| folder                                                             | สิ่งที่เรียนรู้                    |
| ------------------------------------------------------------------ | ---------------------------------- |
| [`examples/01-orm-optimization/`](./examples/01-orm-optimization/) | N+1, select/prefetch, aggregations |
| [`examples/02-rbac-permissions/`](./examples/02-rbac-permissions/) | Custom permission classes          |
| [`examples/03-celery-export/`](./examples/03-celery-export/)       | Celery task + CSV/Excel export     |

ถัดไป: [`LAB.md`](./LAB.md)

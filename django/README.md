📍 **Nav:** [`🏠 Dev Learning Courses Hub`](https://github.com/worapha05/dev-learning-courses-hub/blob/main/README.md) | [`📂 Backend Courses Index`](../README.md) | [`📝 Prompt File`](https://github.com/worapha05/ai-learning-prompts-hub/blob/main/course-generation/backend-courses/django-prompt.md)

---

# Django Expert Bootcamp — Zero to Expert

bootcamp เรียนรู้ **Python Django และ Django REST Framework (DRF)** แบบครบวงจรสำหรับ Backend Developer ที่มุ่งสู่
**MVT Monolith · Headless API · Enterprise Performance**
จาก ORM / Templates → Serializers / ViewSets / JWT → N+1 / RBAC / Celery / Export

---

## เป้าหมายของหลักสูตร

เมื่อจบหลักสูตรนี้ คุณจะสามารถ:

- อธิบาย **MVT Architecture** ของ Django (Model–View–Template) และแยกจาก MVC ได้ชัดเจน
- ใช้ **Django ORM** (`filter` / `exclude` / migrations) และปรับแต่ง **Admin** พร้อม **CSRF** forms
- สร้าง Headless API ด้วย **DRF**: Serializers, APIView, Generic Views, ViewSets + Routers
- ตั้ง **Token / JWT (Simple JWT)** และ **CORS** สำหรับ Frontend
- แก้ **N+1** ด้วย `select_related` / `prefetch_related` และเขียน aggregations
- สร้าง **Custom Permission (RBAC)**, **Celery/Redis** background tasks และ **Excel/CSV Exporter**

---

## โครงสร้างหลักสูตร

| Level            | folder                                   | หัวข้อหลัก                             | เวลาแนะนำ   |
| ---------------- | ---------------------------------------- | -------------------------------------- | ----------- |
| 1 — Beginner     | [`01-beginner/`](./01-beginner/)         | MVT, ORM, Admin, CSRF Forms            | 1–2 สัปดาห์ |
| 2 — Intermediate | [`02-intermediate/`](./02-intermediate/) | DRF, Serializers, ViewSets, JWT/CORS   | 2–3 สัปดาห์ |
| 3 — Expert       | [`03-expert/`](./03-expert/)             | ORM Optimization, RBAC, Celery, Export | 2–4 สัปดาห์ |

แต่ละระดับประกอบด้วย:

1. **`README.md`** — ทฤษฎีเชิงลึกภาษาไทย เน้น architectural patterns (MVT/MVC)
2. **`examples/`** — project Django ที่แยก configuration ชัดเจนและรันได้จริง
3. **`LAB.md`** — โจทย์ปฏิบัติ Web/API พร้อมเฉลยเต็มใน `lab/solution/`

---

## ข้อกำหนดเบื้องต้น

- ความรู้พื้นฐาน Python 3 (classes, decorators, type hints, async พื้นฐาน)
- ความเข้าใจ HTTP (methods, status codes, JSON) พื้นฐาน
- ติดตั้ง [Python 3.11+](https://www.python.org/) และ `pip`
- (ระดับ Expert) Redis สำหรับ Celery

```bash
python3 --version # ควรเป็น 3.11+
pip --version
```

```bash
# Redis สำหรับ Expert (Celery broker)
docker run --name django-bootcamp-redis -p 6379:6379 -d redis:7
```

---

## วิธีใช้ Bootcamp

1. อ่าน `README.md` ของระดับนั้นให้จบก่อน — โฟกัสที่ **ทำไม Django ออกแบบแบบนี้**
2. เปิด `examples/` แล้วรันทีละ project (`pip install -r requirements.txt`)
3. ทำ Lab ใน `LAB.md` **ด้วยตัวเองก่อน** แล้วค่อยดูเฉลย
4. ไประดับถัดไปเมื่ออธิบาย design choice ของตนเองได้

```bash
# Beginner — MVT Blog
cd django-expert-bootcamp/01-beginner/examples/01-mvt-architecture
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

# Intermediate — DRF Setup
cd django-expert-bootcamp/02-intermediate/examples/01-drf-setup
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

# Expert — ORM Optimization
cd django-expert-bootcamp/03-expert/examples/01-orm-optimization
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate && python manage.py runserver
```

---

## Learning Path ที่แนะนำ

```
Beginner: MVT + ORM + Admin + CSRF Forms
 ↓
Intermediate: DRF + Serializers + ViewSets + JWT/CORS
 ↓
Expert: N+1 / Aggregations + RBAC + Celery + Excel/CSV Export
 ↓
project จริงของคุณเอง (Django / DRF Portfolio API)
```

---

## หลักการสำคัญที่หลักสูตรย้ำตลอด

| หลักการ                 | ความหมายใน Django / DRF                                       |
| ----------------------- | ------------------------------------------------------------- |
| MVT ≠ MVC ตรงตัว        | View = request handler; Template = presentation; Model = data |
| Settings แยกชั้น        | `base` / `local` / `production` — ไม่ hardcode secrets        |
| QuerySet เป็น lazy      | SQL ยิงเมื่อ evaluate — ระวัง N+1 ใน loop                     |
| Serializer เป็นสัญญา    | request/response contract + validation อยู่ที่ serializer     |
| Auth ที่ขอบเขต          | Token/JWT ที่ API boundary; Permission แยกจาก Authentication  |
| I/O หนักอยู่นอก request | Celery/Redis สำหรับ export, email, ingestion                  |

---

## Tech Stack มาตรฐานของหลักสูตร

| ชั้น       | เทคโนโลยี                                                     |
| ---------- | ------------------------------------------------------------- |
| Language   | Python 3.11+                                                  |
| Framework  | Django 5.x                                                    |
| API        | Django REST Framework 3.15+                                   |
| Auth       | Token Auth + djangorestframework-simplejwt                    |
| CORS       | django-cors-headers                                           |
| Task Queue | Celery + Redis                                                |
| Export     | openpyxl / csv (stdlib)                                       |
| DB (เรียน) | SQLite (Beginner–Intermediate), PostgreSQL แนะนำสำหรับ Expert |

# Example 03 — Celery + CSV/Excel Export

## เตรียม Redis

```bash
docker run --name django-bootcamp-redis -p 6379:6379 -d redis:7
```

## รัน

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_sales --count 1000
# terminal 1
celery -A config worker -l info
# terminal 2
python manage.py runserver
```

```bash
# สร้าง job
curl -X POST http://127.0.0.1:8000/api/exports/ -H 'Content-Type: application/json' -d '{"format":"csv"}'
# ตรวจสถานะ
curl http://127.0.0.1:8000/api/exports/1/
```

Ingest จาก CSV:

```bash
python manage.py ingest_sales sample_sales.csv --batch-size=500
```

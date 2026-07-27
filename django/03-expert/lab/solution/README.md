# Lab Solution — Enterprise Order Desk

```bash
# Redis
docker run --name django-bootcamp-redis -p 6379:6379 -d redis:7

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_desk
python manage.py ingest_orders sample_orders.csv

# terminal 1
celery -A config worker -l info
# terminal 2
python manage.py runserver
```

Users: `viewer` / `analyst` / `ops` / `admin` — password `pass1234`

```bash
# JWT
curl -X POST http://127.0.0.1:8000/api/token/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"ops","password":"pass1234"}'

# Export
curl -X POST http://127.0.0.1:8000/api/exports/ \
  -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"format":"xlsx"}'
```

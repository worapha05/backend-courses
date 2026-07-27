# Example 02 — Serializers

```bash
pip install -r requirements.txt && python manage.py migrate && python manage.py runserver
```

ลอง POST `/api/products/` ด้วย JSON ที่ราคาติดลบ หรือ SKU ขึ้นต้น TMP + is_active=true

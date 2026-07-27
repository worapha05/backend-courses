# Example 02 — RBAC Permissions

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_rbac
python manage.py runserver
```

ลอง JWT ของ `viewer` vs `manager` กับ `/api/documents/` และ `/api/audit/summary/`

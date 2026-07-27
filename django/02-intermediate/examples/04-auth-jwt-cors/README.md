# Example 04 — Token / JWT / CORS

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py bootstrap_user
python manage.py runserver
```

ทดลอง:

1. `GET /api/public/` — ไม่ต้อง auth
2. `POST /api/token/` ด้วย `{"username":"demo","password":"demo1234"}` → ได้ JWT
3. `GET /api/me/` พร้อม `Authorization: Bearer <access>`
4. หรือใช้ `Authorization: Token <key>` จาก bootstrap

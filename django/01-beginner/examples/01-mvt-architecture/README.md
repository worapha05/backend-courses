# Example 01 — MVT Architecture

เปรียบเทียบ **FBV** (`/`) กับ **CBV** (`/cbv/`) ใน Blog เดียวกัน

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

สร้าง Article ใน `/admin/` แล้วติ๊ก `published`

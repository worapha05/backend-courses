# Example 01 — ORM Optimization

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_orders
python manage.py runserver
```

เปรียบเทียบ `query_count`:

- `/api/orders/naive/`
- `/api/orders/optimized/`
- `/api/customers/revenue/`

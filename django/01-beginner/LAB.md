# Lab ระดับ Beginner — ระบบห้องสมุดขนาดเล็ก (Mini Library)

## เป้าหมาย

สร้างเว็บแอป Django monolith สำหรับยืมหนังสือ โดยใช้ **MVT** ครบวงจร:
Models + ORM queries + FBV/CBV + Templates + Admin + CSRF forms

ทำด้วยตัวเองก่อน แล้วค่อยเทียบกับ [`lab/solution/`](./lab/solution/)

---

## โจทย์

### ส่วนที่ 1 — Models & Migrations

สร้างแอป `library` ที่มีโมเดล:

1. **`Book`**

- `title` (CharField)
- `isbn` (CharField, unique)
- `copies_total` (PositiveIntegerField)
- `copies_available` (PositiveIntegerField)
- `is_active` (BooleanField, default=True)

2. **`Member`**

- `name`, `email` (unique), `joined_at` (auto_now_add)

3. **`Loan`**

- FK ไป `Book` และ `Member`
- `loaned_at` (auto_now_add)
- `returned_at` (DateTimeField, null/blank)
- `is_returned` property หรือ method

รัน `makemigrations` + `migrate`

### ส่วนที่ 2 — Views & Templates

| URL                | พฤติกรรม                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `/`                | รายการหนังสือที่ `is_active=True` และ `copies_available > 0` (ใช้ **ListView**)           |
| `/books/<int:pk>/` | รายละเอียดหนังสือ (FBV + `get_object_or_404`)                                             |
| `/loans/new/`      | form ยืมหนังสือ (ModelForm + `{% csrf_token %}`) — ลด `copies_available` ลง 1 เมื่อสำเร็จ |
| `/members/`        | รายชื่อสมาชิก + จำนวน loan ที่ยังไม่คืน (`annotate` + `Count`)                            |

### ส่วนที่ 3 — Admin

- `BookAdmin`: `list_display`, `search_fields`, `list_filter`
- `LoanAdmin`: แสดง book/member/loaned_at และ readonly `loaned_at`
- ห้ามแก้ `copies_available` ตรง ๆ ใน Admin ถ้ายังไม่พร้อม — ใช้ `readonly_fields` หรือ validation

### ส่วนที่ 4 — ORM Challenge

ใน management command `seed_library` หรือใน view ชั่วคราว แสดง query:

```python
# หนังสือที่ยังมียอดยืมค้าง (มี Loan ที่ returned_at is null)
Book.objects.filter(loans__returned_at__isnull=True).distinct()

# สมาชิกที่ไม่มี loan เลย
Member.objects.exclude(loans__isnull=False) # หรือ annotate + filter
```

---

## เกณฑ์ผ่าน

- [ ] แยก settings เป็น `config/settings/base.py` + `local.py`
- [ ] มี CSRF token ใน form ยืม
- [ ] ยืมแล้ว `copies_available` ลดลง และไม่ยืมได้ถ้าเหลือ 0
- [ ] Admin ใช้งานได้
- [ ] อธิบายได้ว่า View ใน Django ต่างจาก View ใน MVC อย่างไร

---

## คำใบ้

```python
from django.db import transaction

@transaction.atomic
def create_loan(book, member):
 book = Book.objects.select_for_update().get(pk=book.pk)
 if book.copies_available < 1:
 raise ValueError("หมด")
 book.copies_available -= 1
 book.save(update_fields=["copies_available"])
 return Loan.objects.create(book=book, member=member)
```

เฉลยเต็มอยู่ที่ [`lab/solution/`](./lab/solution/)

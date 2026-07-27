# Level 1 — Beginner: Django Monolith Core (MVT)

เป้าหมายระดับนี้: ให้คุณเข้าใจ **สถาปัตยกรรม MVT ของ Django** จริง ๆ
ไม่ใช่แค่เรียก `Model.objects.all()` — เพื่อออกแบบแอป monolith ที่อ่านง่าย ปลอดภัย และ migrate ได้

---

## สารบัญ

1. [MVT vs MVC — Django มองโลกอย่างไร](#1-mvt-vs-mvc--django-มองโลกอย่างไร)
2. [Models & ORM Fundamentals](#2-models--orm-fundamentals)
3. [Views — FBV และ CBV](#3-views--fbv-และ-cbv)
4. [Template Engine](#4-template-engine)
5. [Database Migrations](#5-database-migrations)
6. [Django Admin Customization](#6-django-admin-customization)
7. [CSRF Protection & Secure Forms](#7-csrf-protection--secure-forms)
8. [Configuration Separation](#8-configuration-separation)
9. [Best Practices สรุป](#9-best-practices-สรุป)

---

## 1. MVT vs MVC — Django มองโลกอย่างไร

Django ใช้รูปแบบ **Model–View–Template (MVT)** ซึ่งคล้าย MVC แต่ชื่อและหน้าที่ต่างกันเล็กน้อย:

```
┌─────────────┐ HTTP ┌──────────────────────────────┐
│ Browser │ ────────────► │ URLConf (urls.py)  │
└─────────────┘  └──────────────┬───────────────┘
      │ route → View
      ▼
     ┌──────────────────────┐
     │ View (FBV / CBV) │ ← "Controller" ใน MVC
     │ business + response │
     └──────────┬───────────┘
    ┌───────────────────┼───────────────────┐
    ▼   ▼   ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Model │ │ Template │ │ Forms │
   │ (ORM/DB) │ │ (HTML) │ │ (+ CSRF) │
   └────────────┘ └────────────┘ └────────────┘
```

| ชั้น         | หน้าที่ใน Django                   | เทียบ MVC  |
| ------------ | ---------------------------------- | ---------- |
| **Model**    | schema + business rules ใกล้ข้อมูล | Model      |
| **View**     | รับ request → logic → คืน response | Controller |
| **Template** | แสดงผล HTML                        | View       |

> จุดสำคัญ: **Django View ไม่ใช่ "หน้าจอ"** — มันคือ request handler
> ส่วนที่ผู้ใช้เห็นคือ **Template** (หรือ JSON ใน DRF ระดับ Intermediate)

ดูตัวอย่างรันได้: [`examples/01-mvt-architecture/`](./examples/01-mvt-architecture/)

---

## 2. Models & ORM Fundamentals

Model คือ Python class ที่ map ไปยังตารางในฐานข้อมูลผ่าน Django ORM:

```python
from django.db import models

class Article(models.Model):
 title = models.CharField(max_length=200)
 slug = models.SlugField(unique=True)
 body = models.TextField()
 published = models.BooleanField(default=False)
 created_at = models.DateTimeField(auto_now_add=True)

 class Meta:
 ordering = ["-created_at"]

 def __str__(self) -> str:
 return self.title
```

### QuerySet พื้นฐานที่ต้องชิน

```python
# filter — รวมเงื่อนไขที่ตรง
Article.objects.filter(published=True)

# exclude — ตัดออก
Article.objects.exclude(slug="")

# get — คาดหวังแถวเดียว (DoesNotExist / MultipleObjectsReturned)
Article.objects.get(slug="hello-django")

# chaining (lazy จน evaluate)
Article.objects.filter(published=True).exclude(title="").order_by("-created_at")[:10]
```

| Method                       | ความหมาย                          |
| ---------------------------- | --------------------------------- |
| `filter(**kwargs)`           | WHERE ที่ match                   |
| `exclude(**kwargs)`          | WHERE NOT                         |
| `get(**kwargs)`              | แถวเดียว หรือ raise               |
| `exists()` / `count()`       | ไม่โหลดทั้ง object                |
| `values()` / `values_list()` | คืน dict/tuple แทน model instance |

ดูตัวอย่าง: [`examples/02-orm-queries/`](./examples/02-orm-queries/)

---

## 3. Views — FBV และ CBV

### Function-Based View (FBV)

```python
from django.shortcuts import get_object_or_404, render
from .models import Article

def article_detail(request, slug: str):
 article = get_object_or_404(Article, slug=slug, published=True)
 return render(request, "blog/detail.html", {"article": article})
```

### Class-Based View (CBV)

```python
from django.views.generic import DetailView, ListView
from .models import Article

class ArticleListView(ListView):
 model = Article
 template_name = "blog/list.html"
 context_object_name = "articles"
 queryset = Article.objects.filter(published=True)
```

| เลือกเมื่อ               | FBV | CBV                              |
| ------------------------ | --- | -------------------------------- |
| Logic สั้น ชัด           | ✅  |                                  |
| CRUD ซ้ำ ๆ               |     | ✅ (`ListView`, `CreateView`, …) |
| ต้อง mix-in หลายพฤติกรรม |     | ✅                               |
| อ่านง่ายสำหรับมือใหม่    | ✅  | เริ่มจาก FBV ก่อน                |

---

## 4. Template Engine

Django Template แยก presentation ออกจาก Python:

```django
{# templates/blog/list.html #}
{% extends "base.html" %}
{% block content %}
 <h1>Articles</h1>
 <ul>
 {% for article in articles %}
 <li><a href="{% url 'blog:detail' article.slug %}">{{ article.title }}</a></li>
 {% empty %}
 <li>ยังไม่มีบทความ</li>
 {% endfor %}
 </ul>
{% endblock %}
```

กฎทอง:

- **อย่าใส่ logic หนักใน template** — คำนวณใน view/model
- ใช้ `{% csrf_token %}` ในทุก POST form
- ใช้ `{% url %}` แทน hardcode path

---

## 5. Database Migrations

Migrations คือ version control ของ schema:

```bash
python manage.py makemigrations # สร้างไฟล์ migration จากโมเดล
python manage.py migrate        # apply ลง DB
python manage.py showmigrations # ดูสถานะ
```

```
models.py ──makemigrations──► migrations/0001_*.py ──migrate──► DB schema
```

แนวทางที่ปลอดภัย:

- อย่าแก้ migration ที่ apply ไปแล้วบน shared DB
- แยก data migration ออกจาก schema migration เมื่อเป็นไปได้
- ตรวจ SQL ด้วย `python manage.py sqlmigrate app_label 0001`

---

## 6. Django Admin Customization

Admin คือ CRUD UI ที่ได้ฟรี — แต่ต้อง customize ให้เหมาะกับทีม:

```python
from django.contrib import admin
from .models import Article

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
 list_display = ("title", "published", "created_at")
 list_filter = ("published",)
 search_fields = ("title", "body")
 prepopulated_fields = {"slug": ("title",)}
 readonly_fields = ("created_at",)
```

ดูตัวอย่าง: [`examples/03-admin-csrf-forms/`](./examples/03-admin-csrf-forms/)

---

## 7. CSRF Protection & Secure Forms

**CSRF (Cross-Site Request Forgery)** คือการหลอก browser ให้ส่ง request ในนามผู้ใช้ที่ login อยู่

Django แก้ด้วย middleware + token:

```django
<form method="post">
 {% csrf_token %}
 {{ form.as_p }}
 <button type="submit">ส่ง</button>
</form>
```

```python
from django.views.decorators.csrf import csrf_protect # default สำหรับ views ปกติ
from django.middleware.csrf import get_token
```

Checklist ความปลอดภัย form:

1. ใช้ `{% csrf_token %}` ทุก POST/PUT/PATCH/DELETE จาก browser
2. อย่าปิด `CsrfViewMiddleware` ใน production
3. ใช้ `django.forms.Form` / `ModelForm` แทนอ่าน `request.POST` ดิบ ๆ
4. Validate + sanitize ที่ form/model — ไม่ไว้ใจ client

---

## 8. Configuration Separation

project ใน bootcamp นี้แยก settings เป็นชั้น:

```
config/
 settings/
 __init__.py
 base.py # ค่ากลาง (INSTALLED_APPS, MIDDLEWARE, …)
 local.py # DEBUG=True, SQLite, อ่านง่ายสำหรับเรียน
 # production.py (แนวทางสำหรับ project จริง)
```

```python
# manage.py
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
```

อย่า hardcode `SECRET_KEY` จริงใน repo — ใช้ env ในงานจริง

---

## 9. Best Practices สรุป

| หลักการ              | ทำ                                 |
| -------------------- | ---------------------------------- |
| Fat Model, Thin View | business rule ใกล้ Model / service |
| Explicit URLs        | `app_name` + `path(..., name=...)` |
| get_object_or_404    | อย่า `get()` แล้ว 500              |
| CSRF always on       | สำหรับ session-based forms         |
| Migrations เป็นสัญญา | review ก่อน merge                  |

---

## ตัวอย่างในระดับนี้

| folder                                                             | สิ่งที่เรียนรู้                      |
| ------------------------------------------------------------------ | ------------------------------------ |
| [`examples/01-mvt-architecture/`](./examples/01-mvt-architecture/) | Blog: Model + FBV/CBV + Templates    |
| [`examples/02-orm-queries/`](./examples/02-orm-queries/)           | Bookstore: filter/exclude/migrations |
| [`examples/03-admin-csrf-forms/`](./examples/03-admin-csrf-forms/) | Contact form + Admin customize       |

ถัดไป: ทำ Lab ใน [`LAB.md`](./LAB.md) แล้วค่อยดู [`lab/solution/`](./lab/solution/)

# Level 2 — Intermediate: Django REST Framework (Headless API)

เป้าหมายระดับนี้: เปลี่ยนจาก Django monolith ที่คืน HTML
ไปเป็น **Headless API** ด้วย DRF — Serializers เป็นสัญญา, Views/ViewSets เป็น endpoint, Auth เป็นขอบเขตความปลอดภัย

---

## สารบัญ

1. [จาก MVT สู่ Headless API](#1-จาก-mvt-สู่-headless-api)
2. [ติดตั้งและตั้งค่า DRF](#2-ติดตั้งและตั้งค่า-drf)
3. [Serializers — Serialize / Deserialize / Validate](#3-serializers--serialize--deserialize--validate)
4. [API Views: APIView → Generic → ViewSet](#4-api-views-apiview--generic--viewset)
5. [Routers](#5-routers)
6. [Authentication: Token & JWT](#6-authentication-token--jwt)
7. [CORS สำหรับ Frontend](#7-cors-สำหรับ-frontend)
8. [Best Practices สรุป](#8-best-practices-สรุป)

---

## 1. จาก MVT สู่ Headless API

ในระดับ Beginner: View → Template → HTML
ในระดับนี้: View → Serializer → JSON

```
Client (Vue/React/Mobile)
 │ JSON over HTTP
 ▼
┌───────────────────────────────────┐
│ URLConf / Router   │
│  ▼   │
│ APIView / ViewSet  │
│  ▼   │
│ Serializer (validate + shape) │
│  ▼   │
│ Model / QuerySet (ORM)  │
└───────────────────────────────────┘
```

| ชั้น MVT | เทียบใน DRF        |
| -------- | ------------------ |
| Model    | Model (เหมือนเดิม) |
| View     | APIView / ViewSet  |
| Template | Serializer → JSON  |

ดูตัวอย่าง: [`examples/01-drf-setup/`](./examples/01-drf-setup/)

---

## 2. ติดตั้งและตั้งค่า DRF

```bash
pip install djangorestframework
```

```python
# config/settings/base.py
INSTALLED_APPS = [
 # ...
 "rest_framework",
]

REST_FRAMEWORK = {
 "DEFAULT_PERMISSION_CLASSES": [
 "rest_framework.permissions.AllowAny", # เริ่มต้น — จำกัดทีหลัง
 ],
 "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
 "PAGE_SIZE": 20,
}
```

Browsable API ของ DRF ช่วยทดลอง endpoint ใน browser ได้ทันที

---

## 3. Serializers — Serialize / Deserialize / Validate

Serializer คือ **สัญญาข้อมูล** ระหว่าง API กับโลกภายนอก

```python
from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
 class Meta:
 model = Product
 fields = ("id", "name", "price", "sku", "is_active")
 read_only_fields = ("id",)

 def validate_price(self, value):
 if value <= 0:
  raise serializers.ValidationError("ราคาต้องมากกว่า 0")
 return value

 def validate(self, attrs):
 if attrs.get("sku", "").startswith("TMP") and attrs.get("is_active"):
  raise serializers.ValidationError("SKU ชั่วคราวห้าม active")
 return attrs
```

| ทิศทาง       | เกิดอะไร                          |
| ------------ | --------------------------------- |
| Serialize    | Model/QuerySet → JSON (response)  |
| Deserialize  | JSON → `validated_data` (request) |
| `is_valid()` | รัน field + object validators     |

ดูตัวอย่าง: [`examples/02-serializers/`](./examples/02-serializers/)

---

## 4. API Views: APIView → Generic → ViewSet

### APIView — ควบคุมเต็มมือ

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class ProductListAPI(APIView):
 def get(self, request):
 qs = Product.objects.filter(is_active=True)
 return Response(ProductSerializer(qs, many=True).data)

 def post(self, request):
 ser = ProductSerializer(data=request.data)
 ser.is_valid(raise_exception=True)
 ser.save()
 return Response(ser.data, status=status.HTTP_201_CREATED)
```

### Generic Views — CRUD สำเร็จรูป

```python
from rest_framework import generics

class ProductListCreate(generics.ListCreateAPIView):
 queryset = Product.objects.all()
 serializer_class = ProductSerializer
```

### ViewSets — รวม actions เป็น resource

```python
from rest_framework import viewsets

class ProductViewSet(viewsets.ModelViewSet):
 queryset = Product.objects.all()
 serializer_class = ProductSerializer
```

| ระดับ                   | ใช้เมื่อ                        |
| ----------------------- | ------------------------------- |
| APIView                 | logic พิเศษ / ไม่ใช่ CRUD ตรง ๆ |
| GenericAPIView + mixins | ต้องการบางส่วนของ CRUD          |
| ModelViewSet            | CRUD เต็มชุดของ resource        |

ดูตัวอย่าง: [`examples/03-api-views-viewsets/`](./examples/03-api-views-viewsets/)

---

## 5. Routers

```python
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
urlpatterns = router.urls
# GET/POST /products/ · GET/PUT/PATCH/DELETE /products/{pk}/
```

---

## 6. Authentication: Token & JWT

**Authentication** = ใครเป็นผู้ใช้
**Permission** = ผู้ใช้นี้ทำอะไรได้

### Token Authentication (DRF built-in)

```python
INSTALLED_APPS += ["rest_framework.authtoken"]
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
 "rest_framework.authentication.TokenAuthentication",
]
```

Header: `Authorization: Token <key>`

### JWT — Simple JWT

```bash
pip install djangorestframework-simplejwt
```

```python
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"] = [
 "rest_framework_simplejwt.authentication.JWTAuthentication",
]
```

```python
path("api/token/", TokenObtainPairView.as_view()),
path("api/token/refresh/", TokenRefreshView.as_view()),
```

Header: `Authorization: Bearer <access>`

ดูตัวอย่าง: [`examples/04-auth-jwt-cors/`](./examples/04-auth-jwt-cors/)

---

## 7. CORS สำหรับ Frontend

Browser จะ block cross-origin ถ้าไม่มี CORS headers

```bash
pip install django-cors-headers
```

```python
INSTALLED_APPS += ["corsheaders"]
MIDDLEWARE = ["corsheaders.middleware.CorsMiddleware", ...] # ไว้บน ๆ

CORS_ALLOWED_ORIGINS = [
 "http://localhost:3000",
 "http://127.0.0.1:5173",
]
# พัฒนาเร็ว: CORS_ALLOW_ALL_ORIGINS = True (ห้ามใช้บน production)
```

---

## 8. Best Practices สรุป

| หลักการ                   | ทำ                                  |
| ------------------------- | ----------------------------------- |
| Serializer = contract     | อย่าคืน Model.**dict** ดิบ          |
| Validate ที่ขอบ           | `validate_*` / `validate`           |
| เลือก View ตามความซับซ้อน | อย่า ModelViewSet ทุกอย่างโดยไม่คิด |
| Auth ≠ Permission         | แยกชั้นให้ชัด                       |
| CORS allowlist            | ไม่เปิด `*` บน production           |

---

## ตัวอย่างในระดับนี้

| folder                                                                 | สิ่งที่เรียนรู้                      |
| ---------------------------------------------------------------------- | ------------------------------------ |
| [`examples/01-drf-setup/`](./examples/01-drf-setup/)                   | ติดตั้ง DRF + Hello JSON             |
| [`examples/02-serializers/`](./examples/02-serializers/)               | ModelSerializer + custom validation  |
| [`examples/03-api-views-viewsets/`](./examples/03-api-views-viewsets/) | APIView / Generic / ViewSet + Router |
| [`examples/04-auth-jwt-cors/`](./examples/04-auth-jwt-cors/)           | Token, JWT, CORS                     |

ถัดไป: [`LAB.md`](./LAB.md)

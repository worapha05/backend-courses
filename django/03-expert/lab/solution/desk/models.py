from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        VIEWER = "viewer", "Viewer"
        ANALYST = "analyst", "Analyst"
        OPS = "ops", "Ops"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)


class Customer(models.Model):
    class Segment(models.TextChoices):
        RETAIL = "retail", "Retail"
        WHOLESALE = "wholesale", "Wholesale"

    name = models.CharField(max_length=160)
    email = models.EmailField(unique=True)
    segment = models.CharField(max_length=20, choices=Segment.choices, default=Segment.RETAIL)

    def __str__(self) -> str:
        return self.email


class Order(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PAID = "paid", "Paid"
        SHIPPED = "shipped", "Shipped"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="orders")
    code = models.CharField(max_length=40, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.code


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    sku = models.CharField(max_length=40)
    qty = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)


class ExportJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    class Format(models.TextChoices):
        CSV = "csv", "CSV"
        XLSX = "xlsx", "Excel"

    format = models.CharField(max_length=10, choices=Format.choices, default=Format.CSV)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    file_path = models.CharField(max_length=500, blank=True)
    error_message = models.TextField(blank=True)
    row_count = models.PositiveIntegerField(default=0)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="export_jobs"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

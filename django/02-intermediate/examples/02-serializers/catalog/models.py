from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=120)
    sku = models.CharField(max_length=40, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sku"]

    def __str__(self) -> str:
        return f"{self.sku}: {self.name}"

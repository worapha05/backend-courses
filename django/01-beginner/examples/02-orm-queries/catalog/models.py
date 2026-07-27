from decimal import Decimal
from django.db import models


class Author(models.Model):
    name = models.CharField(max_length=120)
    country = models.CharField(max_length=60, blank=True)

    def __str__(self) -> str:
        return self.name


class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="books")
    price = models.DecimalField(max_digits=8, decimal_places=2)
    in_stock = models.BooleanField(default=True)
    published_year = models.PositiveIntegerField()

    class Meta:
        ordering = ["title"]

    def __str__(self) -> str:
        return self.title

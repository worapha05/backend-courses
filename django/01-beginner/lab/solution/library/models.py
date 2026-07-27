from django.db import models


class Book(models.Model):
    title = models.CharField(max_length=200)
    isbn = models.CharField(max_length=20, unique=True)
    copies_total = models.PositiveIntegerField()
    copies_available = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["title"]

    def __str__(self) -> str:
        return f"{self.title} ({self.isbn})"


class Member(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.name


class Loan(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="loans")
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="loans")
    loaned_at = models.DateTimeField(auto_now_add=True)
    returned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-loaned_at"]

    def __str__(self) -> str:
        return f"{self.book} → {self.member}"

    @property
    def is_returned(self) -> bool:
        return self.returned_at is not None

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        VIEWER = "viewer", "Viewer"
        EDITOR = "editor", "Editor"
        MANAGER = "manager", "Manager"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)


class Document(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="documents")
    is_confidential = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

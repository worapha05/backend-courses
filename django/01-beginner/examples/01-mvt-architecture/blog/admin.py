from django.contrib import admin
from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "published", "created_at")
    prepopulated_fields = {"slug": ("title",)}
    list_filter = ("published",)

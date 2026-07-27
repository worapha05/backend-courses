from django.contrib import admin
from .models import Book, Loan, Member


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "isbn", "copies_available", "copies_total", "is_active")
    list_filter = ("is_active",)
    search_fields = ("title", "isbn")
    readonly_fields = ("copies_available",)


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "joined_at")
    search_fields = ("name", "email")


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ("book", "member", "loaned_at", "returned_at")
    list_filter = ("returned_at",)
    readonly_fields = ("loaned_at",)
    autocomplete_fields = ("book", "member")

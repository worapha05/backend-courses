"""สาธิต filter / exclude / annotate ผ่านหน้า demo."""
from django.db.models import Avg, Count, Q
from django.shortcuts import render

from .models import Author, Book


def query_playground(request):
    # filter + exclude
    affordable = Book.objects.filter(price__lt=300).exclude(in_stock=False)

    # Q objects — OR conditions
    thai_or_cheap = Book.objects.filter(
        Q(author__country="TH") | Q(price__lte=150)
    ).select_related("author")

    # aggregations ต่อ author
    authors_stats = Author.objects.annotate(
        book_count=Count("books"),
        avg_price=Avg("books__price"),
    ).order_by("-book_count")

    return render(
        request,
        "catalog/playground.html",
        {
            "affordable": affordable,
            "thai_or_cheap": thai_or_cheap,
            "authors_stats": authors_stats,
        },
    )

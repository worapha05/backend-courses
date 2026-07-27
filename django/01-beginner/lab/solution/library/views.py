from django.contrib import messages
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.generic import ListView

from .forms import LoanForm
from .models import Book, Member


class BookListView(ListView):
    model = Book
    template_name = "library/book_list.html"
    context_object_name = "books"
    queryset = Book.objects.filter(is_active=True, copies_available__gt=0)


def book_detail(request, pk: int):
    book = get_object_or_404(Book, pk=pk, is_active=True)
    return render(request, "library/book_detail.html", {"book": book})


def loan_create(request):
    if request.method == "POST":
        form = LoanForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "ยืมหนังสือสำเร็จ")
            return redirect("library:book-list")
    else:
        form = LoanForm()
    return render(request, "library/loan_form.html", {"form": form})


def member_list(request):
    members = Member.objects.annotate(
        active_loans=Count("loans", filter=Q(loans__returned_at__isnull=True)),
    )
    return render(request, "library/member_list.html", {"members": members})

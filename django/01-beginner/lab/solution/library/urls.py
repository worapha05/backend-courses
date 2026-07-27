from django.urls import path
from . import views

app_name = "library"
urlpatterns = [
    path("", views.BookListView.as_view(), name="book-list"),
    path("books/<int:pk>/", views.book_detail, name="book-detail"),
    path("loans/new/", views.loan_create, name="loan-create"),
    path("members/", views.member_list, name="member-list"),
]

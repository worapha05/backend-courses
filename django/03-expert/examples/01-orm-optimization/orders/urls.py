from django.urls import path
from .views import CustomerRevenueView, OrdersNaiveView, OrdersOptimizedView

urlpatterns = [
    path("orders/naive/", OrdersNaiveView.as_view()),
    path("orders/optimized/", OrdersOptimizedView.as_view()),
    path("customers/revenue/", CustomerRevenueView.as_view()),
]

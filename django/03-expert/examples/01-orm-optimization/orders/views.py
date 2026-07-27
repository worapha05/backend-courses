from django.db import connection, reset_queries
from django.db.models import Count, DecimalField, Prefetch, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Customer, Order, OrderItem
from .serializers import CustomerStatsSerializer, OrderSerializer


class OrdersNaiveView(APIView):
    """ตั้งใจทำให้เกิด N+1 — ดู SQL ใน console (DEBUG)."""

    def get(self, request):
        reset_queries()
        data = []
        for order in Order.objects.all():  # noqa: intentional N+1 demo
            data.append({
                "id": order.id,
                "customer": order.customer.name,  # extra query
                "items": [i.product_name for i in order.items.all()],  # extra query
            })
        return Response({"query_count": len(connection.queries), "results": data})


class OrdersOptimizedView(APIView):
    def get(self, request):
        reset_queries()
        qs = (
            Order.objects.select_related("customer")
            .prefetch_related(
                Prefetch("items", queryset=OrderItem.objects.only("id", "order_id", "product_name", "quantity", "unit_price"))
            )
            .all()
        )
        payload = OrderSerializer(qs, many=True).data
        return Response({"query_count": len(connection.queries), "results": payload})


class CustomerRevenueView(APIView):
    """Aggregation: จำนวนออเดอร์ + รายได้จากออเดอร์ที่ paid."""

    def get(self, request):
        qs = (
            Customer.objects.annotate(
                order_count=Count("orders"),
                revenue=Coalesce(
                    Sum("orders__total", filter=Q(orders__status=Order.Status.PAID)),
                    0,
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
            )
            .filter(order_count__gt=0)
            .order_by("-revenue")
        )
        return Response(CustomerStatsSerializer(qs, many=True).data)

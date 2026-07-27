from rest_framework import serializers
from .models import Customer, Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ("id", "product_name", "quantity", "unit_price")


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ("id", "customer", "customer_name", "status", "total", "created_at", "items")


class CustomerStatsSerializer(serializers.ModelSerializer):
    order_count = serializers.IntegerField(read_only=True)
    revenue = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Customer
        fields = ("id", "name", "email", "order_count", "revenue")

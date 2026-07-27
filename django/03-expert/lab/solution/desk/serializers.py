from rest_framework import serializers
from .models import ExportJob, Order, OrderLine


class OrderLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderLine
        fields = ("id", "sku", "qty", "unit_price")


class OrderSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = OrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "code", "status", "total", "created_at",
            "customer", "customer_email", "customer_name", "lines",
        )


class ExportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportJob
        fields = (
            "id", "format", "status", "file_path", "error_message",
            "row_count", "requested_by", "created_at", "finished_at",
        )
        read_only_fields = (
            "id", "status", "file_path", "error_message",
            "row_count", "requested_by", "created_at", "finished_at",
        )

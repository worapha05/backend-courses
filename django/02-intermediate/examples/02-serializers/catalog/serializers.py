from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("id", "name", "sku", "price", "is_active")
        read_only_fields = ("id",)

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("ราคาต้องมากกว่า 0")
        return value

    def validate_sku(self, value: str):
        return value.strip().upper()

    def validate(self, attrs):
        sku = attrs.get("sku", getattr(self.instance, "sku", ""))
        is_active = attrs.get("is_active", getattr(self.instance, "is_active", True))
        if str(sku).startswith("TMP") and is_active:
            raise serializers.ValidationError({"sku": "SKU ชั่วคราว (TMP*) ห้ามตั้ง is_active=True"})
        return attrs

from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id", "category", "category_name", "name", "sku",
            "price", "stock", "is_published",
        )
        read_only_fields = ("id",)

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("ราคาต้องมากกว่า 0")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("stock ต้อง ≥ 0")
        return value

    def validate_sku(self, value: str):
        return value.strip().upper()

from rest_framework import serializers
from .models import Category, Item


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name")


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Item
        fields = ("id", "name", "price", "category", "category_name")

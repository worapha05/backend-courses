from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Document
        fields = ("id", "title", "body", "owner", "owner_username", "is_confidential", "created_at")
        read_only_fields = ("id", "owner", "created_at")

"""เปรียบเทียบ APIView / Generic / ViewSet ในแอปเดียว."""
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Item
from .serializers import CategorySerializer, ItemSerializer


# 1) APIView — manual
class CategoryListAPIView(APIView):
    def get(self, request):
        return Response(CategorySerializer(Category.objects.all(), many=True).data)

    def post(self, request):
        ser = CategorySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


# 2) Generic views
class ItemListCreate(generics.ListCreateAPIView):
    queryset = Item.objects.select_related("category").all()
    serializer_class = ItemSerializer


class ItemRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.select_related("category").all()
    serializer_class = ItemSerializer


# 3) ViewSet + Router
class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("category").all()
    serializer_class = ItemSerializer

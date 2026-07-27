from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product
from .serializers import ProductSerializer


class ProductCollection(APIView):
    def get(self, request):
        qs = Product.objects.all().order_by("sku")
        return Response(ProductSerializer(qs, many=True).data)

    def post(self, request):
        ser = ProductSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)

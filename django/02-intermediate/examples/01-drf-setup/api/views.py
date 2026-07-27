from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Endpoint แรกของ Headless API — คืน JSON ไม่ใช่ Template."""

    def get(self, request):
        return Response({
            "status": "ok",
            "framework": "Django REST Framework",
            "message": "Headless API พร้อมใช้งาน",
        })

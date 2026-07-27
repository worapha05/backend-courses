from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class PublicPing(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"scope": "public", "message": "ไม่ต้อง login"})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "auth": request.successful_authenticator.__class__.__name__,
        })

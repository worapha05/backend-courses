from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document
from .permissions import DocumentPermission, IsManagerOrAdmin
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated, DocumentPermission]

    def get_queryset(self):
        qs = Document.objects.select_related("owner").all()
        user = self.request.user
        if user.role in {"manager", "admin"} or user.is_superuser:
            return qs
        return qs.filter(is_confidential=False)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class AuditSummaryView(APIView):
    """endpoint สำหรับ manager+ เท่านั้น"""

    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        return Response({
            "total_documents": Document.objects.count(),
            "confidential": Document.objects.filter(is_confidential=True).count(),
            "role": request.user.role,
        })

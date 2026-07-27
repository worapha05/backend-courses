from django.db.models import Count, DecimalField, Prefetch, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ExportJob, Order, OrderLine
from .permissions import IsAnalystPlus, IsOpsPlus, IsViewerPlus
from .serializers import ExportJobSerializer, OrderSerializer
from .tasks import run_order_export


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsViewerPlus]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects.select_related("customer")
            .prefetch_related(Prefetch("lines", queryset=OrderLine.objects.order_by("id")))
            .all()
        )


class OrderStatsView(APIView):
    permission_classes = [IsAnalystPlus]

    def get(self, request):
        by_status = (
            Order.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        revenue = Order.objects.filter(status=Order.Status.PAID).aggregate(
            revenue=Coalesce(Sum("total"), 0, output_field=DecimalField(max_digits=14, decimal_places=2))
        )
        return Response({"by_status": list(by_status), **revenue})


class ExportJobViewSet(viewsets.ViewSet):
    permission_classes = [IsOpsPlus]

    def list(self, request):
        qs = ExportJob.objects.select_related("requested_by").all()[:50]
        return Response(ExportJobSerializer(qs, many=True).data)

    def create(self, request):
        ser = ExportJobSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        job = ExportJob.objects.create(
            format=ser.validated_data.get("format", ExportJob.Format.CSV),
            requested_by=request.user,
        )
        run_order_export.delay(job.id)
        return Response(ExportJobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    def retrieve(self, request, pk=None):
        job = ExportJob.objects.filter(pk=pk).first()
        if not job:
            return Response({"detail": "not found"}, status=404)
        return Response(ExportJobSerializer(job).data)

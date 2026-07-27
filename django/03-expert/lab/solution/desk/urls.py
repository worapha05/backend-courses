from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExportJobViewSet, OrderStatsView, OrderViewSet

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("exports", ExportJobViewSet, basename="export")

urlpatterns = [
    path("orders/stats/", OrderStatsView.as_view()),
    path("", include(router.urls)),
]

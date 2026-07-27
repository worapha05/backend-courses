from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AuditSummaryView, DocumentViewSet

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")

urlpatterns = [
    path("audit/summary/", AuditSummaryView.as_view()),
    path("", include(router.urls)),
]

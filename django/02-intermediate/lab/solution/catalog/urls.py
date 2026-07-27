from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, MeView, ProductViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")

urlpatterns = [
    path("me/", MeView.as_view()),
    path("", include(router.urls)),
]

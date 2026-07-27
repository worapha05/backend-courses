from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryListAPIView,
    ItemListCreate,
    ItemRetrieveUpdateDestroy,
    ItemViewSet,
)

router = DefaultRouter()
router.register("items-vs", ItemViewSet, basename="item-vs")

urlpatterns = [
    path("categories/", CategoryListAPIView.as_view()),
    path("items/", ItemListCreate.as_view()),
    path("items/<int:pk>/", ItemRetrieveUpdateDestroy.as_view()),
    path("", include(router.urls)),
]

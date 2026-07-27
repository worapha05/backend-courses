from django.urls import path
from .views import ProductCollection
urlpatterns = [path("products/", ProductCollection.as_view())]

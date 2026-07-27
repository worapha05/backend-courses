from django.urls import path
from .views import MeView, PublicPing

urlpatterns = [
    path("public/", PublicPing.as_view()),
    path("me/", MeView.as_view()),
]

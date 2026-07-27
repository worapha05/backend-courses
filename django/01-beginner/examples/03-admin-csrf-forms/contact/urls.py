from django.urls import path
from . import views

app_name = "contact"
urlpatterns = [
    path("", views.inquiry_create, name="create"),
    path("thanks/", views.inquiry_thanks, name="thanks"),
]

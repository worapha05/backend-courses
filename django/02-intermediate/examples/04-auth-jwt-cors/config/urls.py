from django.contrib import admin
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token-auth/", obtain_auth_token),  # DRF Token
    path("api/token/", TokenObtainPairView.as_view()),  # JWT access+refresh
    path("api/token/refresh/", TokenRefreshView.as_view()),
    path("api/", include("accounts.urls")),
]

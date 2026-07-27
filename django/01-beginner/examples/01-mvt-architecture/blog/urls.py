from django.urls import path
from . import views

app_name = "blog"

urlpatterns = [
    path("", views.article_list_fbv, name="list"),
    path("cbv/", views.ArticleListCBV.as_view(), name="list-cbv"),
    path("article/<slug:slug>/", views.article_detail_fbv, name="detail"),
    path("cbv/article/<slug:slug>/", views.ArticleDetailCBV.as_view(), name="detail-cbv"),
]

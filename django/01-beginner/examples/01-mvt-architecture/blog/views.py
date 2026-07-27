"""MVT Views — ทั้ง FBV และ CBV ในแอปเดียวเพื่อเปรียบเทียบ."""
from django.shortcuts import get_object_or_404, render
from django.views.generic import DetailView, ListView

from .models import Article


# --- Function-Based Views ---

def article_list_fbv(request):
    articles = Article.objects.filter(published=True)
    return render(request, "blog/list.html", {"articles": articles, "mode": "FBV"})


def article_detail_fbv(request, slug: str):
    article = get_object_or_404(Article, slug=slug, published=True)
    return render(request, "blog/detail.html", {"article": article, "mode": "FBV"})


# --- Class-Based Views ---

class ArticleListCBV(ListView):
    model = Article
    template_name = "blog/list.html"
    context_object_name = "articles"
    queryset = Article.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["mode"] = "CBV"
        return ctx


class ArticleDetailCBV(DetailView):
    model = Article
    template_name = "blog/detail.html"
    context_object_name = "article"
    slug_field = "slug"
    slug_url_kwarg = "slug"

    def get_queryset(self):
        return Article.objects.filter(published=True)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["mode"] = "CBV"
        return ctx

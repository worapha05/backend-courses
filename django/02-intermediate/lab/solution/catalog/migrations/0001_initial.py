from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("name", models.CharField(max_length=80, unique=True)),
                ("slug", models.SlugField(unique=True)),
            ],
            options={"verbose_name_plural": "categories"},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("name", models.CharField(max_length=160)),
                ("sku", models.CharField(max_length=40, unique=True)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("stock", models.PositiveIntegerField(default=0)),
                ("is_published", models.BooleanField(default=False)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to="catalog.category")),
            ],
        ),
    ]

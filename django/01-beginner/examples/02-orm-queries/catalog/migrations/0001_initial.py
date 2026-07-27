from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Author",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("name", models.CharField(max_length=120)),
                ("country", models.CharField(blank=True, max_length=60)),
            ],
        ),
        migrations.CreateModel(
            name="Book",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("title", models.CharField(max_length=200)),
                ("price", models.DecimalField(decimal_places=2, max_digits=8)),
                ("in_stock", models.BooleanField(default=True)),
                ("published_year", models.PositiveIntegerField()),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="books", to="catalog.author")),
            ],
            options={"ordering": ["title"]},
        ),
    ]

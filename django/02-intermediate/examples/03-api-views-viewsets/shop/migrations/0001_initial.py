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
            ],
        ),
        migrations.CreateModel(
            name="Item",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("name", models.CharField(max_length=120)),
                ("price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("category", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="shop.category")),
            ],
        ),
    ]

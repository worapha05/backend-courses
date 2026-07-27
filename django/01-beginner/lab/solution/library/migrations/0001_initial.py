from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Book",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("title", models.CharField(max_length=200)),
                ("isbn", models.CharField(max_length=20, unique=True)),
                ("copies_total", models.PositiveIntegerField()),
                ("copies_available", models.PositiveIntegerField()),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["title"]},
        ),
        migrations.CreateModel(
            name="Member",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("name", models.CharField(max_length=120)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="Loan",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("loaned_at", models.DateTimeField(auto_now_add=True)),
                ("returned_at", models.DateTimeField(blank=True, null=True)),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="loans", to="library.book")),
                ("member", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="loans", to="library.member")),
            ],
            options={"ordering": ["-loaned_at"]},
        ),
    ]

import django.contrib.auth.models
import django.contrib.auth.validators
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [("auth", "0012_alter_user_first_name_max_length")]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("password", models.CharField(max_length=128)),
                ("last_login", models.DateTimeField(blank=True, null=True)),
                ("is_superuser", models.BooleanField(default=False)),
                ("username", models.CharField(max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()])),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("is_staff", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now)),
                ("role", models.CharField(choices=[("viewer", "Viewer"), ("analyst", "Analyst"), ("ops", "Ops"), ("admin", "Admin")], default="viewer", max_length=20)),
                ("groups", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.group")),
                ("user_permissions", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.permission")),
            ],
            options={"abstract": False},
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.CreateModel(
            name="Customer",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("name", models.CharField(max_length=160)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("segment", models.CharField(choices=[("retail", "Retail"), ("wholesale", "Wholesale")], default="retail", max_length=20)),
            ],
        ),
        migrations.CreateModel(
            name="Order",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("code", models.CharField(max_length=40, unique=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("paid", "Paid"), ("shipped", "Shipped"), ("cancelled", "Cancelled")], default="draft", max_length=20)),
                ("total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="orders", to="desk.customer")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="OrderLine",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("sku", models.CharField(max_length=40)),
                ("qty", models.PositiveIntegerField()),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="desk.order")),
            ],
        ),
        migrations.CreateModel(
            name="ExportJob",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name="ID",
                )),
                ("format", models.CharField(choices=[("csv", "CSV"), ("xlsx", "Excel")], default="csv", max_length=10)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("done", "Done"), ("failed", "Failed")], default="pending", max_length=20)),
                ("file_path", models.CharField(blank=True, max_length=500)),
                ("error_message", models.TextField(blank=True)),
                ("row_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("requested_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="export_jobs", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]

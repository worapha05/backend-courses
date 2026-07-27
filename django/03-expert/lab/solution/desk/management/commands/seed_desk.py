from decimal import Decimal
from django.core.management.base import BaseCommand
from desk.models import Customer, Order, OrderLine, User


class Command(BaseCommand):
    help = "Seed roles + sample orders"

    def handle(self, *args, **options):
        for username, role in [
            ("viewer", User.Role.VIEWER),
            ("analyst", User.Role.ANALYST),
            ("ops", User.Role.OPS),
            ("admin", User.Role.ADMIN),
        ]:
            u, _ = User.objects.get_or_create(username=username, defaults={"role": role})
            u.role = role
            u.set_password("pass1234")
            if role == User.Role.ADMIN:
                u.is_staff = True
            u.save()

        c, _ = Customer.objects.get_or_create(
            email="alice@example.com", defaults={"name": "Alice", "segment": "retail"}
        )
        o, created = Order.objects.get_or_create(
            code="ORD-1001",
            defaults={"customer": c, "status": Order.Status.PAID, "total": Decimal("250.00")},
        )
        if created:
            OrderLine.objects.create(order=o, sku="SKU-A", qty=2, unit_price=Decimal("100.00"))
            OrderLine.objects.create(order=o, sku="SKU-B", qty=1, unit_price=Decimal("50.00"))
        self.stdout.write(self.style.SUCCESS("Seeded users (pass1234) + sample order"))

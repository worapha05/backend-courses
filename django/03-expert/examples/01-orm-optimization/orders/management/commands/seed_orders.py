from decimal import Decimal
from django.core.management.base import BaseCommand
from orders.models import Customer, Order, OrderItem


class Command(BaseCommand):
    help = "Seed customers/orders for N+1 demos"

    def handle(self, *args, **options):
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Customer.objects.all().delete()
        for i in range(1, 6):
            c = Customer.objects.create(name=f"Customer {i}", email=f"c{i}@example.com")
            for j in range(2):
                o = Order.objects.create(
                    customer=c,
                    status=Order.Status.PAID if j == 0 else Order.Status.PENDING,
                    total=Decimal("100.00") * i,
                )
                OrderItem.objects.create(
                    order=o, product_name=f"Item-{i}-{j}", quantity=j + 1, unit_price=Decimal("50.00")
                )
        self.stdout.write(self.style.SUCCESS("Seeded 5 customers"))

from __future__ import annotations

import csv
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from desk.models import Customer, Order, OrderLine


class Command(BaseCommand):
    help = "Bulk ingest orders CSV: code,customer_email,customer_name,status,total,sku,qty,unit_price"

    def add_arguments(self, parser):
        parser.add_argument("csv_path")
        parser.add_argument("--batch-size", type=int, default=500)

    def handle(self, *args, **options):
        path = Path(options["csv_path"])
        if not path.exists():
            raise CommandError(f"missing file: {path}")

        created_orders = 0
        created_lines = 0
        skipped = 0

        with path.open(newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                code = row["code"].strip()
                if Order.objects.filter(code=code).exists():
                    skipped += 1
                    continue
                with transaction.atomic():
                    customer, _ = Customer.objects.get_or_create(
                        email=row["customer_email"].strip().lower(),
                        defaults={"name": row["customer_name"].strip()},
                    )
                    order = Order.objects.create(
                        customer=customer,
                        code=code,
                        status=row.get("status") or Order.Status.DRAFT,
                        total=Decimal(row["total"]),
                    )
                    OrderLine.objects.create(
                        order=order,
                        sku=row["sku"].strip().upper(),
                        qty=int(row["qty"]),
                        unit_price=Decimal(row["unit_price"]),
                    )
                    created_orders += 1
                    created_lines += 1

        self.stdout.write(self.style.SUCCESS(
            f"orders={created_orders} lines={created_lines} skipped={skipped}"
        ))

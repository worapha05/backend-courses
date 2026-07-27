from __future__ import annotations

import csv
from pathlib import Path

from django.conf import settings
from openpyxl import Workbook

from .models import OrderLine


def export_orders_csv(dest: Path) -> int:
    """Flat CSV ของทุก OrderLine — ใช้ select_related + iterator."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    qs = OrderLine.objects.select_related("order", "order__customer").order_by("order_id", "id")
    with dest.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["code", "customer_email", "status", "total", "sku", "qty", "unit_price"])
        for line in qs.iterator(chunk_size=2000):
            writer.writerow([
                line.order.code,
                line.order.customer.email,
                line.order.status,
                line.order.total,
                line.sku,
                line.qty,
                line.unit_price,
            ])
            count += 1
    return count


def export_orders_xlsx(dest: Path) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook(write_only=True)
    ws = wb.create_sheet("orders")
    ws.append(["code", "customer_email", "status", "total", "sku", "qty", "unit_price"])
    count = 0
    qs = OrderLine.objects.select_related("order", "order__customer").order_by("order_id", "id")
    for line in qs.iterator(chunk_size=2000):
        ws.append([
            line.order.code,
            line.order.customer.email,
            line.order.status,
            float(line.order.total),
            line.sku,
            line.qty,
            float(line.unit_price),
        ])
        count += 1
    wb.save(dest)
    return count


def export_dir() -> Path:
    path = Path(settings.EXPORT_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path

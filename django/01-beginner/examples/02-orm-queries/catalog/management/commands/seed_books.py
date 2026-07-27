from decimal import Decimal
from django.core.management.base import BaseCommand
from catalog.models import Author, Book


class Command(BaseCommand):
    help = "Seed sample authors and books for ORM demos"

    def handle(self, *args, **options):
        a1, _ = Author.objects.get_or_create(name="Somchai", defaults={"country": "TH"})
        a2, _ = Author.objects.get_or_create(name="Ada Lovelace", defaults={"country": "UK"})
        samples = [
            ("Django Deep Dive", a1, "250.00", 2024, True),
            ("Python Tricks", a1, "180.00", 2023, True),
            ("Out of Print Classic", a2, "999.00", 1990, False),
            ("Cheap Notes", a2, "99.00", 2021, True),
        ]
        for title, author, price, year, stock in samples:
            Book.objects.update_or_create(
                title=title,
                defaults={
                    "author": author,
                    "price": Decimal(price),
                    "published_year": year,
                    "in_stock": stock,
                },
            )
        self.stdout.write(self.style.SUCCESS("Seeded authors/books"))

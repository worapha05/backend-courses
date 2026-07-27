from django.core.management.base import BaseCommand
from library.models import Book, Member


class Command(BaseCommand):
    help = "Seed books and members"

    def handle(self, *args, **options):
        Book.objects.update_or_create(
            isbn="978-0001",
            defaults={"title": "Django for Pros", "copies_total": 3, "copies_available": 3},
        )
        Book.objects.update_or_create(
            isbn="978-0002",
            defaults={"title": "ORM Mastery", "copies_total": 2, "copies_available": 1},
        )
        Member.objects.update_or_create(email="ann@example.com", defaults={"name": "Ann"})
        Member.objects.update_or_create(email="bee@example.com", defaults={"name": "Bee"})
        self.stdout.write(self.style.SUCCESS("Library seeded"))

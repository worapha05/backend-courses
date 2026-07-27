from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token

User = get_user_model()


class Command(BaseCommand):
    help = "Create demo user + DRF token"

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(username="demo", defaults={"email": "demo@example.com"})
        if created:
            user.set_password("demo1234")
            user.save()
        token, _ = Token.objects.get_or_create(user=user)
        self.stdout.write(self.style.SUCCESS(f"user=demo password=demo1234 token={token.key}"))

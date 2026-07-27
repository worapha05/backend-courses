from django.core.management.base import BaseCommand
from rbacdemo.models import Document, User


class Command(BaseCommand):
    help = "Seed users with roles + sample documents"

    def handle(self, *args, **options):
        users = {
            "viewer": User.Role.VIEWER,
            "editor": User.Role.EDITOR,
            "manager": User.Role.MANAGER,
        }
        created_users = {}
        for username, role in users.items():
            u, _ = User.objects.get_or_create(username=username, defaults={"role": role})
            u.role = role
            u.set_password("pass1234")
            u.save()
            created_users[username] = u
        Document.objects.get_or_create(
            title="Public Spec",
            defaults={"body": "ok to read", "owner": created_users["editor"], "is_confidential": False},
        )
        Document.objects.get_or_create(
            title="Secret Plan",
            defaults={"body": "managers only", "owner": created_users["manager"], "is_confidential": True},
        )
        self.stdout.write(self.style.SUCCESS("Users: viewer/editor/manager password=pass1234"))

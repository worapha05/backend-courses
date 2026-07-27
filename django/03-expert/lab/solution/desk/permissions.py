from rest_framework.permissions import BasePermission

ROLE_RANK = {"viewer": 1, "analyst": 2, "ops": 3, "admin": 4}


class HasMinRole(BasePermission):
    min_role = "viewer"

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return ROLE_RANK.get(user.role, 0) >= ROLE_RANK[self.min_role]


class IsViewerPlus(HasMinRole):
    min_role = "viewer"


class IsAnalystPlus(HasMinRole):
    min_role = "analyst"


class IsOpsPlus(HasMinRole):
    min_role = "ops"

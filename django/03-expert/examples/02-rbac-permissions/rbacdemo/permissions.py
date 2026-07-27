from rest_framework.permissions import SAFE_METHODS, BasePermission


class HasRole(BasePermission):
    """ฐาน RBAC — ตรวจ role ของ custom User."""

    required_roles: set[str] = set()

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return user.role in self.required_roles


class IsManagerOrAdmin(HasRole):
    required_roles = {"manager", "admin"}


class IsEditorOrAbove(HasRole):
    required_roles = {"editor", "manager", "admin"}


class DocumentPermission(BasePermission):
    """
    object-level:
    - อ่าน: authenticated ทุกคน (confidential เฉพาะ manager+)
    - เขียน: editor+
    - ลบ: manager+ หรือ owner
    """

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == "DELETE":
            # อนุญาตผ่านชั้น view — object-level จะจำกัดเฉพาะ manager+/owner
            return True
        return request.user.role in {"editor", "manager", "admin"}

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if user.is_superuser or user.role == "admin":
            return True
        if request.method in SAFE_METHODS:
            if obj.is_confidential:
                return user.role in {"manager", "admin"}
            return True
        if request.method == "DELETE":
            return user.role in {"manager", "admin"} or obj.owner_id == user.id
        return user.role in {"editor", "manager", "admin"}

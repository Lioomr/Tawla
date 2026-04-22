from rest_framework.permissions import BasePermission

from apps.restaurants.models import StaffRole


class IsStaffAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "staff_profile")
        )


class IsKitchenOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "staff_profile")
        ):
            return False

        return request.user.staff_profile.role in {StaffRole.KITCHEN, StaffRole.ADMIN}


class IsWaiterOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "staff_profile")
        ):
            return False

        return request.user.staff_profile.role in {StaffRole.WAITER, StaffRole.ADMIN}


class IsAdminStaff(BasePermission):
    def has_permission(self, request, view):
        if not (
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "staff_profile")
        ):
            return False

        return request.user.staff_profile.role == StaffRole.ADMIN

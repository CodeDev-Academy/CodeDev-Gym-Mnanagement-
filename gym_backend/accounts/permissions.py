from rest_framework import permissions


class IsOwnerUser(permissions.BasePermission):
    """
    Allows access only to users who are Owners or Superusers.
    """
    message = 'Access restricted: Only the Gym Owner can perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_owner
        )

from django.urls import path
from .views import (
    ChangePasswordView,
    CurrentUserView,
    LoginView,
    StaffListView,
    StaffResetPasswordView,
    StaffToggleStatusView,
    UserProfileView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('staff/', StaffListView.as_view(), name='staff_list'),
    path('staff/<int:pk>/reset-password/', StaffResetPasswordView.as_view(), name='staff_reset_password'),
    path('staff/<int:pk>/toggle-status/', StaffToggleStatusView.as_view(), name='staff_toggle_status'),
]


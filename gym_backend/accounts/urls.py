from django.urls import path
from .views import ChangePasswordView, CurrentUserView, LoginView, UserProfileView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
]

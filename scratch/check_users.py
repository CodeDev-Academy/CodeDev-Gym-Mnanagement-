import os
import sys
sys.path.insert(0, os.path.abspath('gym_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gym_backend.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
for u in User.objects.all():
    print(f"User: {u.username}, Role: {u.role}, is_active: {u.is_active}, has_usable_password: {u.has_usable_password()}")

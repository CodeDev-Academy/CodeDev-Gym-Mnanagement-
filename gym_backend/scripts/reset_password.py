import os
import sys
import getpass
import django

# Set up Django environment using relative project paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

# Configurable master recovery PIN (defaults to 123456 or environment variable GYM_RECOVERY_PIN)
MASTER_RECOVERY_PIN = os.getenv('GYM_RECOVERY_PIN', '123456')


def main():
    print("=" * 56)
    print("       GYM OS - LOCAL ACCOUNT PASSWORD RECOVERY")
    print("=" * 56)
    print("Note: This tool is for authorized gym administrators only.")
    print()

    # Step 1: Security PIN Verification
    pin_attempt = getpass.getpass("Enter 6-digit Master Recovery PIN: ").strip()
    if pin_attempt != MASTER_RECOVERY_PIN:
        print("\nERROR: Invalid recovery PIN. Access denied.")
        return

    # Step 2: Select User
    default_user = "admin"
    username = input(f"Enter target username [press Enter for '{default_user}']: ").strip()
    if not username:
        username = default_user

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print(f"\nERROR: User '{username}' does not exist in the database.")
        return

    print(f"\nAccount found: {user.username} (Role: {user.get_role_display()})")
    print("-" * 56)

    # Step 3: Enter New Password (Hidden Input)
    new_password = getpass.getpass("Enter new password: ")
    if not new_password:
        print("\nERROR: Password cannot be empty.")
        return

    confirm_password = getpass.getpass("Confirm new password: ")
    if new_password != confirm_password:
        print("\nERROR: Passwords do not match.")
        return

    # Step 4: Validate and Save
    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        print("\nPassword validation failed:")
        for err in e.messages:
            print(f" - {err}")
        return

    user.set_password(new_password)
    user.save()

    print("=" * 56)
    print(f"SUCCESS: Password for '{user.username}' has been updated.")
    print("You can now open the login screen and sign in.")
    print("=" * 56)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
    finally:
        input("\nPress Enter to close this window...")

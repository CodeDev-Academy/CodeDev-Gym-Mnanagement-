import os
import hashlib
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()


class Command(BaseCommand):
    help = "Sets up or resets the dedicated automation service account (Owner role) for external bots (e.g. n8n)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--token',
            type=str,
            help='Specify a fixed token key instead of auto-generating one.',
        )
        parser.add_argument(
            '--regenerate',
            action='store_true',
            help='Forces regeneration of the auth token even if one already exists.',
        )

    def handle(self, *args, **options):
        username = 'automation_bot'

        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                'first_name': 'Automation',
                'last_name': 'Service Bot',
                'email': 'automation_bot@gymmanagement.local',
                'role': 'OWNER',
                'is_active': True,
            },
        )

        # Ensure correct role and flags
        updated_fields = []
        if user.role != 'OWNER':
            user.role = 'OWNER'
            updated_fields.append('role')
        if not user.is_active:
            user.is_active = True
            updated_fields.append('is_active')

        # Lock out interactive password logins; service account authenticates via token
        if user.has_usable_password():
            user.set_unusable_password()
            updated_fields.append('password')

        if updated_fields:
            user.save(update_fields=updated_fields)

        custom_token = options.get('token') or os.getenv('AUTOMATION_BOT_TOKEN')
        regenerate = options.get('regenerate')

        if custom_token:
            if len(custom_token) > 40:
                custom_token = hashlib.sha1(custom_token.encode('utf-8')).hexdigest()[:40]
            existing_token = Token.objects.filter(user=user).first()
            if existing_token and existing_token.key == custom_token:
                token = existing_token
                token_status = "Retrieved existing token"
            else:
                Token.objects.filter(user=user).delete()
                token = Token.objects.create(user=user, key=custom_token)
                token_status = "Assigned custom token"
        elif regenerate:
            Token.objects.filter(user=user).delete()
            token = Token.objects.create(user=user)
            token_status = "Regenerated fresh token"
        else:
            token, token_created = Token.objects.get_or_create(user=user)
            token_status = "Created new token" if token_created else "Retrieved existing token"

        self.stdout.write(self.style.SUCCESS("=" * 64))
        self.stdout.write(self.style.SUCCESS(" AUTOMATION BOT SERVICE ACCOUNT CONFIGURED"))
        self.stdout.write(self.style.SUCCESS("=" * 64))
        self.stdout.write(f"Username    : {user.username}")
        self.stdout.write(f"Role        : {user.role} (Owner privileges for daily summaries & updates)")
        self.stdout.write(f"Status      : {'Active' if user.is_active else 'Inactive'}")
        self.stdout.write(f"Token Action: {token_status}")
        self.stdout.write(self.style.WARNING(f"API Token   : {token.key}"))
        self.stdout.write("-" * 64)
        self.stdout.write("Use this token in n8n Header Auth:")
        self.stdout.write("  Name : Authorization")
        self.stdout.write(f"  Value: Token {token.key}")
        self.stdout.write("=" * 64)

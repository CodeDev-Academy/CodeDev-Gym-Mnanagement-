from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('OWNER', 'Owner'),
        ('FRONT_DESK', 'Front-desk Staff'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='FRONT_DESK',
        help_text='Designates the role and permission tier of the user.',
    )

    @property
    def is_owner(self):
        return self.role == 'OWNER' or self.is_superuser

    @property
    def is_front_desk(self):
        return self.role == 'FRONT_DESK'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from .utils import normalize_phone_number, validate_e164_phone


class Member(models.Model):
    full_name = models.CharField(max_length=150)
    phone_number = models.CharField(
        max_length=20,
        unique=True,
        help_text='Stored in international format, e.g. +234...',
    )
    email = models.EmailField(max_length=150, blank=True, null=True)
    photo = models.FileField(upload_to='members/photos/', blank=True, null=True)
    date_joined = models.DateField(default=timezone.localdate)
    is_active = models.BooleanField(default=True)
    last_inactivity_reminder_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text='Tracks when the 14-day inactivity reminder was last sent to avoid duplicate messages.',
    )

    class Meta:
        db_table = 'member'
        ordering = ['-date_joined', 'full_name']

    def clean(self):
        super().clean()
        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)
            validate_e164_phone(self.phone_number)

    def save(self, *args, **kwargs):
        if self.phone_number:
            self.phone_number = normalize_phone_number(self.phone_number)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"


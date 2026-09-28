from django.db import models
from django.utils import timezone


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

    class Meta:
        db_table = 'member'
        ordering = ['-date_joined', 'full_name']

    def __str__(self):
        return f"{self.full_name} ({self.phone_number})"

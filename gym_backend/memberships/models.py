from django.db import models
from members.models import Member


class MembershipPlan(models.Model):
    name = models.CharField(max_length=100)
    duration_days = models.PositiveIntegerField(help_text='Validity duration in days')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'membership_plan'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.duration_days} days - ₦{self.price})"


class Subscription(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('frozen', 'Frozen'),
        ('cancelled', 'Cancelled'),
    )

    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text='Stored field updated by scheduled job or manual freeze.',
    )
    reminder_sent = models.BooleanField(
        default=False,
        help_text='Resets to False on renewal.',
    )
    reminder_sent_at = models.DateTimeField(blank=True, null=True)
    lapsed_stage = models.PositiveSmallIntegerField(
        default=0,
        help_text='Lapsed milestone tracking: 0=none, 1=7d sent, 2=30d sent, 3=60d sent',
    )
    last_lapsed_reminder_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'subscription'
        ordering = ['-end_date']
        indexes = [
            models.Index(fields=['status', 'end_date'], name='sub_status_end_idx'),
            models.Index(fields=['status', 'end_date', 'lapsed_stage'], name='sub_status_lapsed_idx'),
        ]

    def __str__(self):
        return f"{self.member.full_name} - {self.plan.name} ({self.status})"


class ReminderTemplate(models.Model):
    key = models.CharField(
        max_length=50,
        unique=True,
        help_text='Template identifier: expiry_3d, lapsed_7d, lapsed_30d, lapsed_60d, inactive_14d, welcome_sub',
    )
    title = models.CharField(max_length=150)
    body = models.TextField(
        help_text='Template text. Supports variables like {name}, {plan_name}, {end_date}, {days_left}, {price}',
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reminder_template'
        ordering = ['key']

    def __str__(self):
        return f"{self.title} ({self.key})"

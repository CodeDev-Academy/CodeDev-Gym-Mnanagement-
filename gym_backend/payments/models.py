from django.conf import settings
from django.db import models
from memberships.models import Subscription


class Payment(models.Model):
    METHOD_CHOICES = (
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('card', 'Card (POS)'),
        ('flutterwave', 'Flutterwave'),
    )

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_payments',
        help_text='Staff/Owner who recorded this payment transaction.',
    )

    class Meta:
        db_table = 'payment'
        ordering = ['-payment_date']

    def __str__(self):
        return f"₦{self.amount} ({self.get_method_display()}) for {self.subscription.member.full_name}"

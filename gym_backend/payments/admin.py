from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'amount', 'method', 'payment_date', 'recorded_by')
    list_filter = ('method', 'payment_date')
    search_fields = ('subscription__member__full_name', 'subscription__member__phone_number')

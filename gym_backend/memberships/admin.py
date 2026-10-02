from django.contrib import admin
from .models import MembershipPlan, Subscription, ReminderTemplate


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'duration_days', 'price', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('member', 'plan', 'start_date', 'end_date', 'status', 'reminder_sent', 'lapsed_stage')
    list_filter = ('status', 'reminder_sent', 'lapsed_stage', 'plan')
    search_fields = ('member__full_name', 'member__phone_number')


@admin.register(ReminderTemplate)
class ReminderTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'key', 'is_active', 'updated_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'key', 'body')

from django.contrib import admin
from .models import CheckIn


@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('member', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('member__full_name', 'member__phone_number')

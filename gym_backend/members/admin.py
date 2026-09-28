from django.contrib import admin
from .models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'email', 'date_joined', 'is_active')
    search_fields = ('full_name', 'phone_number', 'email')
    list_filter = ('is_active', 'date_joined')

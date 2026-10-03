from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Member
from .utils import normalize_phone_number, validate_e164_phone


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            'id',
            'full_name',
            'phone_number',
            'email',
            'photo',
            'date_joined',
            'is_active',
        ]
        read_only_fields = ['id']

    def validate_phone_number(self, value):
        if not value:
            raise serializers.ValidationError("Phone number cannot be empty.")
        normalized = normalize_phone_number(value)
        try:
            validate_e164_phone(normalized)
        except DjangoValidationError as e:
            msg = e.messages[0] if hasattr(e, 'messages') and e.messages else str(e)
            raise serializers.ValidationError(msg)
        return normalized



class MemberDetailSerializer(serializers.ModelSerializer):
    active_subscription = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            'id',
            'full_name',
            'phone_number',
            'email',
            'photo',
            'date_joined',
            'is_active',
            'active_subscription',
        ]
        read_only_fields = ['id']

    def get_active_subscription(self, obj):
        sub = obj.subscriptions.filter(status='active').order_by('-end_date').first()
        if not sub:
            return None
        return {
            'id': sub.id,
            'plan_id': sub.plan.id,
            'plan_name': sub.plan.name,
            'start_date': sub.start_date,
            'end_date': sub.end_date,
            'status': sub.status,
            'reminder_sent': sub.reminder_sent,
        }

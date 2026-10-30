from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from members.models import Member
from .models import CheckIn


class CheckInSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_phone = serializers.CharField(source='member.phone_number', read_only=True)
    member_email = serializers.CharField(source='member.email', read_only=True)
    active_plan_name = serializers.SerializerMethodField()
    subscription_status = serializers.SerializerMethodField()

    class Meta:
        model = CheckIn
        fields = [
            'id',
            'member',
            'member_name',
            'member_phone',
            'member_email',
            'active_plan_name',
            'subscription_status',
            'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']

    def get_active_plan_name(self, obj):
        today = timezone.localdate()
        active_sub = (
            obj.member.subscriptions.filter(status='active', end_date__gte=today)
            .order_by('-end_date')
            .first()
        )
        return active_sub.plan.name if active_sub else None

    def get_subscription_status(self, obj):
        today = timezone.localdate()
        active_sub = (
            obj.member.subscriptions.filter(status='active', end_date__gte=today)
            .order_by('-end_date')
            .first()
        )
        if active_sub:
            return 'active'
        latest_sub = obj.member.subscriptions.order_by('-end_date').first()
        return latest_sub.status if latest_sub else 'no_subscription'


class CreateCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ['id', 'member', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def validate(self, attrs):
        member = attrs.get('member')
        # Debounce: prevent duplicate check-in within 2 minutes
        cooldown_threshold = timezone.now() - timedelta(minutes=2)
        recent_checkin = CheckIn.objects.filter(
            member=member,
            timestamp__gte=cooldown_threshold,
        ).first()
        if recent_checkin:
            local_time = timezone.localtime(recent_checkin.timestamp).strftime('%H:%M')
            raise serializers.ValidationError(
                f"{member.full_name} was already checked in just now ({local_time}). Duplicate check-in prevented."
            )
        return attrs

    def to_representation(self, instance):
        return CheckInSerializer(instance).data

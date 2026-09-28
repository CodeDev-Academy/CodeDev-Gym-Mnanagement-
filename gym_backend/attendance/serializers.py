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
        active_sub = obj.member.subscriptions.filter(status='active').order_by('-end_date').first()
        return active_sub.plan.name if active_sub else None

    def get_subscription_status(self, obj):
        active_sub = obj.member.subscriptions.filter(status='active').order_by('-end_date').first()
        if active_sub:
            return 'active'
        latest_sub = obj.member.subscriptions.order_by('-end_date').first()
        return latest_sub.status if latest_sub else 'no_subscription'


class CreateCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ['id', 'member', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def to_representation(self, instance):
        return CheckInSerializer(instance).data

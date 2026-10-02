from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from members.models import Member
from .models import MembershipPlan, Subscription, ReminderTemplate


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = ['id', 'name', 'duration_days', 'price', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_duration_days(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration days must be greater than 0.")
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class SubscriptionSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_phone = serializers.CharField(source='member.phone_number', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    plan_duration = serializers.IntegerField(source='plan.duration_days', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'member',
            'member_name',
            'member_phone',
            'plan',
            'plan_name',
            'plan_price',
            'plan_duration',
            'start_date',
            'end_date',
            'status',
            'reminder_sent',
            'reminder_sent_at',
        ]
        read_only_fields = ['id', 'end_date', 'reminder_sent', 'reminder_sent_at']


class AssignPlanSerializer(serializers.Serializer):
    member = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())
    plan = serializers.PrimaryKeyRelatedField(queryset=MembershipPlan.objects.all())
    start_date = serializers.DateField(default=timezone.localdate)

    def create(self, validated_data):
        member = validated_data['member']
        plan = validated_data['plan']
        start_date = validated_data.get('start_date', timezone.localdate())
        end_date = start_date + timedelta(days=plan.duration_days)

        subscription = Subscription.objects.create(
            member=member,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            status='active',
            reminder_sent=False,
        )
        return subscription

    def to_representation(self, instance):
        return SubscriptionSerializer(instance).data


class ReminderTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderTemplate
        fields = ['id', 'key', 'title', 'body', 'is_active', 'updated_at']
        read_only_fields = ['id', 'key', 'updated_at']

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


from .utils import render_template, wa_url


class AssignPlanSerializer(serializers.Serializer):
    member = serializers.PrimaryKeyRelatedField(queryset=Member.objects.all())
    plan = serializers.PrimaryKeyRelatedField(queryset=MembershipPlan.objects.all())
    start_date = serializers.DateField(default=timezone.localdate)
    duration_multiplier = serializers.IntegerField(default=1, min_value=1, max_value=24, required=False)

    def create(self, validated_data):
        member = validated_data['member']
        plan = validated_data['plan']
        start_date = validated_data.get('start_date', timezone.localdate())
        multiplier = validated_data.get('duration_multiplier', 1)
        total_days = plan.duration_days * multiplier
        end_date = start_date + timedelta(days=total_days)

        subscription = Subscription.objects.create(
            member=member,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            status='active',
            reminder_sent=False,
        )
        subscription._multiplier = multiplier
        subscription._total_price = plan.price * multiplier
        return subscription

    def to_representation(self, instance):
        data = SubscriptionSerializer(instance).data
        multiplier = getattr(instance, '_multiplier', 1)
        total_price = getattr(instance, '_total_price', instance.plan.price * multiplier)
        data['duration_multiplier'] = multiplier
        data['total_price'] = float(total_price)

        plan_display = f"{instance.plan.name} ({multiplier}x - {multiplier * instance.plan.duration_days} days)" if multiplier > 1 else instance.plan.name
        welcome_copy = render_template(
            'welcome_sub',
            "Welcome to Abuja Gym, {name}! Your {plan_name} subscription is active until {end_date}. Receipt Amount: NGN {price}. See you on the gym floor!",
            name=instance.member.full_name,
            plan_name=plan_display,
            end_date=str(instance.end_date),
            price=f"{total_price:,.2f}",
        )
        data['welcome_message'] = welcome_copy
        data['whatsapp_url'] = wa_url(instance.member.phone_number, welcome_copy)
        return data


class ReminderTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderTemplate
        fields = ['id', 'key', 'title', 'body', 'is_active', 'updated_at']
        read_only_fields = ['id', 'key', 'updated_at']

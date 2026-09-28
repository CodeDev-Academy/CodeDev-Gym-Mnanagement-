from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from memberships.models import Subscription
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source='subscription.member.id', read_only=True)
    member_name = serializers.CharField(source='subscription.member.full_name', read_only=True)
    member_phone = serializers.CharField(source='subscription.member.phone_number', read_only=True)
    plan_name = serializers.CharField(source='subscription.plan.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    subscription_end_date = serializers.DateField(source='subscription.end_date', read_only=True)
    subscription_status = serializers.CharField(source='subscription.status', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'subscription',
            'member_id',
            'member_name',
            'member_phone',
            'plan_name',
            'amount',
            'payment_date',
            'method',
            'recorded_by',
            'recorded_by_name',
            'subscription_end_date',
            'subscription_status',
        ]
        read_only_fields = ['id', 'payment_date', 'recorded_by']


class RecordPaymentSerializer(serializers.ModelSerializer):
    is_renewal = serializers.BooleanField(
        default=False,
        write_only=True,
        help_text="If True, extends the subscription end_date and resets reminder_sent to False."
    )

    class Meta:
        model = Payment
        fields = ['id', 'subscription', 'amount', 'method', 'is_renewal']
        read_only_fields = ['id']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value

    def create(self, validated_data):
        is_renewal = validated_data.pop('is_renewal', False)
        request = self.context.get('request')
        recorded_by = request.user if request and request.user.is_authenticated else None

        payment = Payment.objects.create(
            recorded_by=recorded_by,
            **validated_data
        )

        subscription = payment.subscription

        if is_renewal:
            today = timezone.localdate()
            duration_days = subscription.plan.duration_days

            if subscription.end_date >= today:
                new_end_date = subscription.end_date + timedelta(days=duration_days)
            else:
                new_end_date = today + timedelta(days=duration_days)

            subscription.end_date = new_end_date
            subscription.status = 'active'
            subscription.reminder_sent = False
            subscription.reminder_sent_at = None
            subscription.save()

        return payment

    def to_representation(self, instance):
        return PaymentSerializer(instance).data

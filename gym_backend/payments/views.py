from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsOwnerUser
from .models import Payment
from .serializers import PaymentSerializer, RecordPaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related(
        'subscription__member',
        'subscription__plan',
        'recorded_by'
    )
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

    def get_permissions(self):
        if self.action in ['destroy', 'summary', 'update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsOwnerUser()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return RecordPaymentSerializer
        return PaymentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        member_id = self.request.query_params.get('member')
        subscription_id = self.request.query_params.get('subscription')
        method_param = self.request.query_params.get('method')

        # Front-Desk Staff sees today's shift receipts by default,
        # but CAN inspect historical receipts when looking up a specific member/subscription.
        if getattr(self.request.user, 'is_front_desk', False) and not (member_id or subscription_id):
            today = timezone.localdate()
            queryset = queryset.filter(payment_date__date=today)

        if member_id:
            queryset = queryset.filter(subscription__member_id=member_id)
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        if method_param:
            queryset = queryset.filter(method=method_param)

        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        total_revenue = Payment.objects.aggregate(total=Sum('amount'))['total'] or 0
        total_count = Payment.objects.count()

        by_method = (
            Payment.objects.values('method')
            .annotate(total_amount=Sum('amount'), count=Count('id'))
            .order_by('-total_amount')
        )

        return Response({
            'total_revenue': str(total_revenue),
            'total_transactions': total_count,
            'by_method': list(by_method),
        }, status=status.HTTP_200_OK)

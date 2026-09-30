from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from accounts.permissions import IsOwnerUser
from .models import MembershipPlan, Subscription
from .serializers import MembershipPlanSerializer, SubscriptionSerializer, AssignPlanSerializer


class MembershipPlanViewSet(viewsets.ModelViewSet):
    queryset = MembershipPlan.objects.all()
    serializer_class = MembershipPlanSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'price', 'duration_days', 'created_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerUser()]
        return [permissions.IsAuthenticated()]


    def get_queryset(self):
        queryset = super().get_queryset()
        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            if is_active_param.lower() in ['true', '1']:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in ['false', '0']:
                queryset = queryset.filter(is_active=False)
        return queryset


class SubscriptionViewSet(viewsets.ModelViewSet):
    queryset = Subscription.objects.all().select_related('member', 'plan')
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_date', 'end_date', 'status']
    ordering = ['-end_date']

    def get_serializer_class(self):
        if self.action == 'create':
            return AssignPlanSerializer
        return SubscriptionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        member_id = self.request.query_params.get('member')
        status_param = self.request.query_params.get('status')
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

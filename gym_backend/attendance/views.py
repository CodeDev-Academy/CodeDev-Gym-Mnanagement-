from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CheckIn
from .serializers import CheckInSerializer, CreateCheckInSerializer


class CheckInViewSet(viewsets.ModelViewSet):
    queryset = CheckIn.objects.all().select_related('member').prefetch_related('member__subscriptions__plan')
    serializer_class = CheckInSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateCheckInSerializer
        return CheckInSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        member_id = self.request.query_params.get('member')
        today_param = self.request.query_params.get('today')

        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if today_param and today_param.lower() in ['true', '1']:
            today = timezone.localdate()
            queryset = queryset.filter(timestamp__date=today)

        return queryset

    @action(detail=False, methods=['get'])
    def today_stats(self, request):
        today = timezone.localdate()
        today_count = CheckIn.objects.filter(timestamp__date=today).count()
        return Response({
            'today_count': today_count,
            'today_date': today.strftime('%Y-%m-%d'),
        }, status=status.HTTP_200_OK)

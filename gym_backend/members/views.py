from rest_framework import viewsets, permissions, filters
from .models import Member
from .serializers import MemberSerializer, MemberDetailSerializer


class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all().prefetch_related('subscriptions__plan')
    serializer_class = MemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['full_name', 'phone_number', 'email']
    ordering_fields = ['full_name', 'date_joined', 'is_active']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        return MemberSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            if is_active_param.lower() in ['true', '1']:
                queryset = queryset.filter(is_active=True)
            elif is_active_param.lower() in ['false', '0']:
                queryset = queryset.filter(is_active=False)
        return queryset

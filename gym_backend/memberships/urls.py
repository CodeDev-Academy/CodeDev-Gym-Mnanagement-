from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MembershipPlanViewSet,
    SubscriptionViewSet,
    ReminderTemplateViewSet,
    PendingRemindersView,
    MarkRemindersSentView,
)

router = DefaultRouter()
router.register(r'plans', MembershipPlanViewSet, basename='plan')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'reminders/templates', ReminderTemplateViewSet, basename='reminder-template')

urlpatterns = [
    path('reminders/pending/', PendingRemindersView.as_view(), name='reminders-pending'),
    path('reminders/mark-sent/', MarkRemindersSentView.as_view(), name='reminders-mark-sent'),
    path('', include(router.urls)),
]

from django.urls import path
from .views import DashboardStatsView, DailySummaryView

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('daily-summary/', DailySummaryView.as_view(), name='dashboard-daily-summary'),
]

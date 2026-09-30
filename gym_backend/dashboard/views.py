import datetime
from django.db.models import Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from attendance.models import CheckIn
from members.models import Member
from memberships.models import Subscription
from payments.models import Payment
from accounts.permissions import IsOwnerUser



class DashboardStatsView(APIView):
    """
    Returns aggregated business statistics for the gym dashboard:
    - Active members count
    - Today's check-ins count
    - This month's revenue total
    - Today's revenue total
    - Subscriptions expiring within 7 days
    - Recent activity feeds (check-ins, payments)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        week_ahead = today + datetime.timedelta(days=7)

        # 1. Member stats
        total_members = Member.objects.filter(is_active=True).count()
        # Count distinct members who have an active subscription not yet expired
        active_members_count = (
            Subscription.objects.filter(status='active', end_date__gte=today)
            .values('member')
            .distinct()
            .count()
        )

        # 2. Check-in stats
        today_checkins = CheckIn.objects.filter(timestamp__date=today).count()
        today_unique_checkins = (
            CheckIn.objects.filter(timestamp__date=today)
            .values('member')
            .distinct()
            .count()
        )

        # 3. Revenue stats
        month_revenue_agg = Payment.objects.filter(
            payment_date__year=today.year,
            payment_date__month=today.month,
        ).aggregate(total=Sum('amount'))
        month_revenue = float(month_revenue_agg['total'] or 0.00)

        today_revenue_agg = Payment.objects.filter(
            payment_date__date=today
        ).aggregate(total=Sum('amount'))
        today_revenue = float(today_revenue_agg['total'] or 0.00)

        # 4. Expiring this week (active subscriptions expiring within next 7 days)
        expiring_qs = (
            Subscription.objects.filter(
                status='active',
                end_date__gte=today,
                end_date__lte=week_ahead,
            )
            .select_related('member', 'plan')
            .order_by('end_date')
        )
        expiring_count = expiring_qs.count()

        expiring_list = []
        for sub in expiring_qs[:10]:
            days_left = (sub.end_date - today).days
            expiring_list.append({
                'subscription_id': sub.id,
                'id': sub.id,
                'member_id': sub.member.id,
                'member_name': sub.member.full_name,
                'phone_number': sub.member.phone_number,
                'plan_id': sub.plan.id if sub.plan else None,
                'plan_name': sub.plan.name if sub.plan else 'Unknown',
                'plan_price': float(sub.plan.price) if sub.plan else 0.0,
                'plan_duration': sub.plan.duration_days if sub.plan else 0,
                'end_date': sub.end_date.isoformat(),
                'days_left': days_left,
                'reminder_sent': sub.reminder_sent,
            })

        # 5. Recent Check-ins (last 6)
        recent_checkins_qs = (
            CheckIn.objects.select_related('member')
            .order_by('-timestamp')[:6]
        )
        recent_checkins = [
            {
                'id': ci.id,
                'member_id': ci.member.id,
                'member_name': ci.member.full_name,
                'phone_number': ci.member.phone_number,
                'timestamp': ci.timestamp.isoformat(),
            }
            for ci in recent_checkins_qs
        ]

        # 6. Recent Payments (last 6)
        is_owner = getattr(request.user, 'is_owner', False)
        recent_payments_base = Payment.objects.select_related('subscription__member', 'subscription__plan')
        if not is_owner:
            # Receptionists only see today's shift receipts
            recent_payments_base = recent_payments_base.filter(payment_date__date=today)

        recent_payments_qs = recent_payments_base.order_by('-payment_date')[:6]
        recent_payments = []
        for p in recent_payments_qs:
            m = p.subscription.member if p.subscription else None
            plan = p.subscription.plan if p.subscription else None
            recent_payments.append({
                'id': p.id,
                'member_id': m.id if m else None,
                'member_name': m.full_name if m else 'N/A',
                'plan_name': plan.name if plan else 'N/A',
                'amount': float(p.amount),
                'method': p.method,
                'method_display': p.get_method_display(),
                'payment_date': p.payment_date.isoformat(),
            })

        return Response({
            'metrics': {
                'total_members': total_members,
                'active_members': active_members_count,
                'today_checkins': today_checkins,
                'today_unique_checkins': today_unique_checkins,
                'month_revenue': month_revenue if is_owner else None,
                'today_revenue': today_revenue if is_owner else None,
                'expiring_this_week_count': expiring_count,
                'is_owner': is_owner,
            },
            'expiring_this_week': expiring_list,
            'recent_checkins': recent_checkins,
            'recent_payments': recent_payments,
            'generated_at': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)


class DailySummaryView(APIView):
    """
    Daily summary endpoint intended for Owner report & n8n automation (Phase 6):
    Returns revenue today, check-ins today, new members registered today, and expiring members today.
    """
    permission_classes = [permissions.IsAuthenticated, IsOwnerUser]


    def get(self, request):
        today = timezone.localdate()

        new_members_today = Member.objects.filter(date_joined=today).count()
        today_checkins = CheckIn.objects.filter(timestamp__date=today).count()
        today_unique_checkins = (
            CheckIn.objects.filter(timestamp__date=today)
            .values('member')
            .distinct()
            .count()
        )

        today_rev_agg = Payment.objects.filter(payment_date__date=today).aggregate(total=Sum('amount'))
        today_revenue = float(today_rev_agg['total'] or 0.00)

        expiring_today = Subscription.objects.filter(status='active', end_date=today).count()

        return Response({
            'date': today.isoformat(),
            'revenue_today': today_revenue,
            'checkins_today': today_checkins,
            'unique_checkins_today': today_unique_checkins,
            'new_members_today': new_members_today,
            'expiring_today': expiring_today,
        }, status=status.HTTP_200_OK)

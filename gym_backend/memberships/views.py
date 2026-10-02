import urllib.parse
from datetime import timedelta
from django.utils import timezone
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsOwnerUser
from members.models import Member
from .models import MembershipPlan, ReminderTemplate, Subscription
from .serializers import (
    AssignPlanSerializer,
    MembershipPlanSerializer,
    ReminderTemplateSerializer,
    SubscriptionSerializer,
)


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

    @action(detail=False, methods=['get'], url_path='expiring-soon')
    def expiring_soon(self, request):
        days = int(request.query_params.get('days', 3))
        today = timezone.localdate()
        target_date = today + timedelta(days=days)
        subs = self.get_queryset().filter(
            status='active',
            reminder_sent=False,
            end_date__gte=today,
            end_date__lte=target_date,
        )
        data = [
            {
                'id': s.id,
                'subscription_id': s.id,
                'member_id': s.member_id,
                'member_name': s.member.full_name,
                'phone_number': s.member.phone_number,
                'plan_name': s.plan.name,
                'end_date': str(s.end_date),
                'days_left': (s.end_date - today).days,
            }
            for s in subs
        ]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch', 'post'], url_path='mark-reminded')
    def mark_reminded(self, request, pk=None):
        sub = self.get_object()
        sub.reminder_sent = True
        sub.reminder_sent_at = timezone.now()
        sub.save(update_fields=['reminder_sent', 'reminder_sent_at'])
        return Response(
            {'detail': 'Subscription marked as reminded.', 'id': sub.id},
            status=status.HTTP_200_OK,
        )


class PendingRemindersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        templates = {
            t.key: t.body for t in ReminderTemplate.objects.filter(is_active=True)
        }

        def clean_phone(phone):
            raw = ''.join(c for c in str(phone) if c.isdigit())
            if raw.startswith('0') and len(raw) == 11:
                return '234' + raw[1:]
            return raw

        def wa_url(phone, message):
            return f"https://wa.me/{clean_phone(phone)}?text={urllib.parse.quote(message)}"

        def format_msg(key, fallback, **kwargs):
            tpl = templates.get(key, fallback)
            try:
                return tpl.format(**kwargs)
            except Exception:
                return fallback.format(**kwargs)

        # 1. Category: Expiring Soon (in next 3 days)
        target_expiry = today + timedelta(days=3)
        expiring_subs = (
            Subscription.objects.filter(
                status='active',
                reminder_sent=False,
                end_date__gte=today,
                end_date__lte=target_expiry,
            )
            .select_related('member', 'plan')
            .order_by('end_date')
        )

        expiring_list = []
        for s in expiring_subs:
            days_left = (s.end_date - today).days
            msg = format_msg(
                'expiry_3d',
                "Hi {name}, you have built great momentum with your workouts at Abuja Gym! Just a gentle heads-up that your {plan_name} pass ends in {days_left} days on {end_date}. We want to make sure your training routine stays smooth and uninterrupted so you keep hitting your personal fitness goals. Keep up the strong work!",
                name=s.member.full_name,
                plan_name=s.plan.name,
                end_date=str(s.end_date),
                days_left=days_left,
            )
            expiring_list.append({
                'id': s.id,
                'subscription_id': s.id,
                'member_id': s.member_id,
                'member_name': s.member.full_name,
                'phone_number': s.member.phone_number,
                'plan_name': s.plan.name,
                'end_date': str(s.end_date),
                'days_count': days_left,
                'prepared_message': msg,
                'whatsapp_url': wa_url(s.member.phone_number, msg),
            })

        # Find members with active ongoing/future subscriptions
        active_member_ids = set(
            Subscription.objects.filter(
                status='active',
                end_date__gte=today,
            ).values_list('member_id', flat=True)
        )

        # 2, 3, 4. Lapsed Candidates (no active current/future plan)
        lapsed_candidates = (
            Subscription.objects.exclude(member_id__in=active_member_ids)
            .filter(status__in=['active', 'expired'], end_date__lt=today)
            .select_related('member', 'plan')
            .order_by('member_id', '-end_date')
        )

        latest_lapsed_by_member = {}
        for sub in lapsed_candidates:
            if sub.member_id not in latest_lapsed_by_member:
                latest_lapsed_by_member[sub.member_id] = sub

        lapsed_7d_list = []
        lapsed_30d_list = []
        lapsed_60d_list = []

        for sub in latest_lapsed_by_member.values():
            days_past = (today - sub.end_date).days

            # Stage 1: 7 to 14 days
            if 7 <= days_past <= 14 and sub.lapsed_stage < 1:
                msg = format_msg(
                    'lapsed_7d',
                    "Hi {name}, we really miss your energy on the gym floor this past week! Life and work get busy, but your health and self-care always matter. Whether you needed a few rest days or got caught up with commitments, remember that it only takes one session to get that incredible post-workout feeling back. We are right in your corner whenever you are ready to pick up where you left off!",
                    name=sub.member.full_name,
                    plan_name=sub.plan.name,
                    end_date=str(sub.end_date),
                    days_left=days_past,
                )
                lapsed_7d_list.append({
                    'id': sub.id,
                    'subscription_id': sub.id,
                    'member_id': sub.member_id,
                    'member_name': sub.member.full_name,
                    'phone_number': sub.member.phone_number,
                    'plan_name': sub.plan.name,
                    'end_date': str(sub.end_date),
                    'days_count': days_past,
                    'prepared_message': msg,
                    'whatsapp_url': wa_url(sub.member.phone_number, msg),
                })
            # Stage 2: 30 to 45 days
            elif 30 <= days_past <= 45 and sub.lapsed_stage < 2:
                msg = format_msg(
                    'lapsed_30d',
                    "Hi {name}, remember the commitment and sweat you put in during your first month? You proved to yourself what you are capable of. It is completely normal to fall out of rhythm, but your fitness goals are still within reach. Do not let your hard-earned progress fade away—take that first step back today, even if it is just a 30-minute workout!",
                    name=sub.member.full_name,
                    plan_name=sub.plan.name,
                    end_date=str(sub.end_date),
                    days_left=days_past,
                )
                lapsed_30d_list.append({
                    'id': sub.id,
                    'subscription_id': sub.id,
                    'member_id': sub.member_id,
                    'member_name': sub.member.full_name,
                    'phone_number': sub.member.phone_number,
                    'plan_name': sub.plan.name,
                    'end_date': str(sub.end_date),
                    'days_count': days_past,
                    'prepared_message': msg,
                    'whatsapp_url': wa_url(sub.member.phone_number, msg),
                })
            # Stage 3: 60 to 75 days
            elif 60 <= days_past <= 75 and sub.lapsed_stage < 3:
                msg = format_msg(
                    'lapsed_60d',
                    "Hi {name}, it has been a little while, and we wanted to remind you that your fitness journey is never all-or-nothing. There is zero judgment here—whenever you are ready for a clean slate, our entire community is here to welcome you back and help you feel strong and energized again. You did it before, and you can do it again!",
                    name=sub.member.full_name,
                    plan_name=sub.plan.name,
                    end_date=str(sub.end_date),
                    days_left=days_past,
                )
                lapsed_60d_list.append({
                    'id': sub.id,
                    'subscription_id': sub.id,
                    'member_id': sub.member_id,
                    'member_name': sub.member.full_name,
                    'phone_number': sub.member.phone_number,
                    'plan_name': sub.plan.name,
                    'end_date': str(sub.end_date),
                    'days_count': days_past,
                    'prepared_message': msg,
                    'whatsapp_url': wa_url(sub.member.phone_number, msg),
                })

        # 5. Inactive Active Pass Holders (14+ days absent)
        fourteen_days_ago = today - timedelta(days=14)
        active_members_qs = Member.objects.filter(
            id__in=active_member_ids,
            date_joined__lte=fourteen_days_ago,
        ).prefetch_related('subscriptions', 'check_ins')

        inactive_14d_list = []
        for m in active_members_qs:
            if m.last_inactivity_reminder_at:
                days_since_alert = (timezone.now() - m.last_inactivity_reminder_at).days
                if days_since_alert < 14:
                    continue

            latest_checkin = m.check_ins.order_by('-timestamp').first()
            absent_days = 0
            if latest_checkin:
                checkin_date = timezone.localtime(latest_checkin.timestamp).date()
                if checkin_date <= fourteen_days_ago:
                    absent_days = (today - checkin_date).days
                else:
                    continue
            else:
                absent_days = (today - m.date_joined).days

            active_sub = (
                m.subscriptions.filter(status='active', end_date__gte=today)
                .order_by('-end_date')
                .first()
            )
            plan_name = active_sub.plan.name if active_sub else 'Active Pass'

            msg = format_msg(
                'inactive_14d',
                "Hi {name}, we noticed you haven't been in for a workout over the last two weeks. Life gets busy, but don't lose that hard-earned momentum! Your workout community at Abuja Gym is here to support you whenever you're ready to get back on the floor.",
                name=m.full_name,
                plan_name=plan_name,
                end_date=str(active_sub.end_date) if active_sub else '',
                days_left=absent_days,
            )
            inactive_14d_list.append({
                'id': m.id,
                'member_id': m.id,
                'member_name': m.full_name,
                'phone_number': m.phone_number,
                'plan_name': plan_name,
                'end_date': str(active_sub.end_date) if active_sub else 'Active',
                'days_count': absent_days,
                'prepared_message': msg,
                'whatsapp_url': wa_url(m.phone_number, msg),
            })

        return Response({
            'counts': {
                'expiring_3d': len(expiring_list),
                'lapsed_7d': len(lapsed_7d_list),
                'lapsed_30d': len(lapsed_30d_list),
                'lapsed_60d': len(lapsed_60d_list),
                'inactive_14d': len(inactive_14d_list),
            },
            'categories': {
                'expiring_3d': expiring_list,
                'lapsed_7d': lapsed_7d_list,
                'lapsed_30d': lapsed_30d_list,
                'lapsed_60d': lapsed_60d_list,
                'inactive_14d': inactive_14d_list,
            },
        }, status=status.HTTP_200_OK)


class MarkRemindersSentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        category = request.data.get('category')
        subscription_ids = request.data.get('subscription_ids', [])
        member_ids = request.data.get('member_ids', [])
        now = timezone.now()

        if category == 'expiring_3d' and subscription_ids:
            updated = Subscription.objects.filter(id__in=subscription_ids).update(
                reminder_sent=True,
                reminder_sent_at=now,
            )
            return Response({'updated': updated, 'detail': f"Marked {updated} subscriptions as reminded."})

        elif category == 'lapsed_7d' and subscription_ids:
            updated = Subscription.objects.filter(id__in=subscription_ids).update(
                lapsed_stage=1,
                last_lapsed_reminder_at=now,
            )
            return Response({'updated': updated, 'detail': f"Marked {updated} subscriptions at lapsed stage 1."})

        elif category == 'lapsed_30d' and subscription_ids:
            updated = Subscription.objects.filter(id__in=subscription_ids).update(
                lapsed_stage=2,
                last_lapsed_reminder_at=now,
            )
            return Response({'updated': updated, 'detail': f"Marked {updated} subscriptions at lapsed stage 2."})

        elif category == 'lapsed_60d' and subscription_ids:
            updated = Subscription.objects.filter(id__in=subscription_ids).update(
                lapsed_stage=3,
                last_lapsed_reminder_at=now,
            )
            return Response({'updated': updated, 'detail': f"Marked {updated} subscriptions at lapsed stage 3."})

        elif category == 'inactive_14d' and member_ids:
            updated = Member.objects.filter(id__in=member_ids).update(
                last_inactivity_reminder_at=now,
            )
            return Response({'updated': updated, 'detail': f"Marked {updated} members with inactivity cooldown."})

        return Response(
            {'error': 'Invalid category or missing IDs.'},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ReminderTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReminderTemplate.objects.all().order_by('key')
    serializer_class = ReminderTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsOwnerUser()]
        return [permissions.IsAuthenticated()]

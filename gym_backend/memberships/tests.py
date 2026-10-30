from datetime import timedelta
from decimal import Decimal
from django.core.management import call_command
from django.db.models import ProtectedError
from django.utils import timezone
from django.test import TestCase

from members.models import Member
from memberships.models import MembershipPlan, Subscription

class MembershipTestCase(TestCase):
    def setUp(self):
        self.plan = MembershipPlan.objects.create(
            name='Standard Plan',
            price=Decimal('10000.00'),
            duration_days=30,
            is_active=True,
        )
        self.member = Member.objects.create(
            full_name='Amina Garba',
            phone_number='08033322110',
        )

    def test_expire_subscriptions_command(self):
        today = timezone.localdate()

        # Active subscription that is NOT expired
        sub_active = Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date=today,
            end_date=today + timedelta(days=10),
            status='active',
        )

        # Active subscription that IS expired (past end_date)
        sub_overdue = Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date=today - timedelta(days=40),
            end_date=today - timedelta(days=10),
            status='active',
        )

        call_command('expire_subscriptions')

        sub_active.refresh_from_db()
        sub_overdue.refresh_from_db()

        self.assertEqual(sub_active.status, 'active')
        self.assertEqual(sub_overdue.status, 'expired')

    def test_member_protected_from_deletion_when_subscription_exists(self):
        today = timezone.localdate()
        Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date=today,
            end_date=today + timedelta(days=30),
            status='active',
        )

        # Deleting member should raise ProtectedError
        with self.assertRaises(ProtectedError):
            self.member.delete()

from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db.models import ProtectedError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from members.models import Member
from memberships.models import MembershipPlan, Subscription

User = get_user_model()


class MembershipTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner_sub',
            password='testpassword123',
            role='OWNER',
        )
        self.receptionist = User.objects.create_user(
            username='receptionist_sub',
            password='testpassword123',
            role='FRONT_DESK',
        )

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

    def test_front_desk_cannot_delete_or_modify_subscription(self):
        today = timezone.localdate()
        sub = Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date=today,
            end_date=today + timedelta(days=30),
            status='active',
        )

        self.client.force_authenticate(user=self.receptionist)

        # Attempt DELETE
        del_resp = self.client.delete(f'/api/subscriptions/{sub.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Subscription.objects.filter(id=sub.id).exists())

        # Attempt PATCH
        patch_resp = self.client.patch(f'/api/subscriptions/{sub.id}/', {'status': 'cancelled'})
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'active')

    def test_owner_can_modify_and_delete_unbilled_subscription(self):
        today = timezone.localdate()
        sub = Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date=today,
            end_date=today + timedelta(days=30),
            status='active',
        )

        self.client.force_authenticate(user=self.owner)

        # Owner can PATCH
        patch_resp = self.client.patch(f'/api/subscriptions/{sub.id}/', {'status': 'cancelled'})
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertEqual(sub.status, 'cancelled')

        # Owner can DELETE unbilled subscription
        del_resp = self.client.delete(f'/api/subscriptions/{sub.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Subscription.objects.filter(id=sub.id).exists())

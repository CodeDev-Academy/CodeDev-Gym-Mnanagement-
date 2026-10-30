from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from attendance.models import CheckIn
from members.models import Member
from memberships.models import MembershipPlan, Subscription

User = get_user_model()


class AttendanceTestCase(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner_user',
            password='testpassword123',
            role='OWNER',
        )
        self.receptionist = User.objects.create_user(
            username='receptionist_user',
            password='testpassword123',
            role='FRONT_DESK',
        )

        self.plan = MembershipPlan.objects.create(
            name='Daily Workout',
            price=Decimal('2000.00'),
            duration_days=1,
            is_active=True,
        )

        self.member = Member.objects.create(
            full_name='Chidi Anagonye',
            phone_number='08099887766',
            email='chidi@example.com',
        )

        self.sub = Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=1),
            status='active',
        )

    def test_checkin_creation_success(self):
        self.client.force_authenticate(user=self.receptionist)
        url = '/api/attendance/'
        payload = {'member': self.member.id}
        response = self.client.post(url, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CheckIn.objects.filter(member=self.member).count(), 1)
        self.assertEqual(response.data['member_name'], self.member.full_name)
        self.assertEqual(response.data['active_plan_name'], self.plan.name)
        self.assertEqual(response.data['subscription_status'], 'active')

    def test_checkin_debounce_prevents_duplicate_within_2_minutes(self):
        self.client.force_authenticate(user=self.receptionist)
        url = '/api/attendance/'
        payload = {'member': self.member.id}

        # First check-in succeeds
        resp1 = self.client.post(url, payload)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        # Second rapid check-in within seconds should be rejected
        resp2 = self.client.post(url, payload)
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Duplicate check-in prevented', str(resp2.data))

    def test_front_desk_cannot_delete_checkin(self):
        checkin = CheckIn.objects.create(member=self.member)

        self.client.force_authenticate(user=self.receptionist)
        del_resp = self.client.delete(f'/api/attendance/{checkin.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(CheckIn.objects.filter(id=checkin.id).exists())

    def test_owner_can_delete_checkin(self):
        checkin = CheckIn.objects.create(member=self.member)

        self.client.force_authenticate(user=self.owner)
        del_resp = self.client.delete(f'/api/attendance/{checkin.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CheckIn.objects.filter(id=checkin.id).exists())

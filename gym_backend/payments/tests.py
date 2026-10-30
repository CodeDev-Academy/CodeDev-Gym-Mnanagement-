from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from members.models import Member
from memberships.models import MembershipPlan, Subscription
from payments.models import Payment

User = get_user_model()


class PaymentTestCase(APITestCase):
    def setUp(self):
        # Create Owner and Front-Desk users
        self.owner = User.objects.create_user(
            username='gymowner',
            password='testpassword123',
            role='OWNER',
        )
        self.receptionist = User.objects.create_user(
            username='receptionist1',
            password='testpassword123',
            role='FRONT_DESK',
        )

        # Create Plan
        self.plan = MembershipPlan.objects.create(
            name='Monthly Fitness',
            price=Decimal('15000.00'),
            duration_days=30,
            is_active=True,
        )

        # Create Members
        self.member1 = Member.objects.create(
            full_name='Emeka Okonkwo',
            phone_number='08012345678',
            email='emeka@example.com',
        )
        self.member2 = Member.objects.create(
            full_name='Fatima Bello',
            phone_number='08087654321',
            email='fatima@example.com',
        )

        # Member1 active subscription
        self.today = timezone.localdate()
        self.sub1 = Subscription.objects.create(
            member=self.member1,
            plan=self.plan,
            start_date=self.today,
            end_date=self.today + timedelta(days=30),
            status='active',
            lapsed_stage=1,
            last_lapsed_reminder_at=timezone.now(),
        )

    def test_record_initial_payment_success(self):
        self.client.force_authenticate(user=self.receptionist)
        url = '/api/payments/'
        payload = {
            'subscription': self.sub1.id,
            'amount': '15000.00',
            'method': 'cash',
            'is_renewal': False,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        payment = Payment.objects.get(id=response.data['id'])
        self.assertEqual(payment.recorded_by, self.receptionist)
        self.assertEqual(payment.amount, Decimal('15000.00'))

        # Subscription end_date should remain unchanged when is_renewal is False
        self.sub1.refresh_from_db()
        self.assertEqual(self.sub1.end_date, self.today + timedelta(days=30))

    def test_record_renewal_payment_extends_end_date_and_resets_lapsed(self):
        self.client.force_authenticate(user=self.receptionist)
        url = '/api/payments/'
        payload = {
            'subscription': self.sub1.id,
            'amount': '15000.00',
            'method': 'bank_transfer',
            'is_renewal': True,
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.sub1.refresh_from_db()
        # Initial end_date was today + 30 days; with renewal it should be today + 60 days
        self.assertEqual(self.sub1.end_date, self.today + timedelta(days=60))
        self.assertEqual(self.sub1.lapsed_stage, 0)
        self.assertIsNone(self.sub1.last_lapsed_reminder_at)
        self.assertFalse(self.sub1.reminder_sent)

    def test_front_desk_can_query_historical_member_payments(self):
        # Create an older payment for member1
        p = Payment.objects.create(
            subscription=self.sub1,
            amount=Decimal('15000.00'),
            method='card',
            recorded_by=self.owner,
        )
        # Artificially set payment_date to yesterday
        Payment.objects.filter(id=p.id).update(
            payment_date=timezone.now() - timedelta(days=1)
        )

        self.client.force_authenticate(user=self.receptionist)

        # 1. Without member filter, receptionist only sees today's shift payments (should be 0)
        resp1 = self.client.get('/api/payments/')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        results1 = resp1.data['results'] if isinstance(resp1.data, dict) and 'results' in resp1.data else resp1.data
        self.assertEqual(len(results1), 0)

        # 2. With member filter, receptionist can inspect full payment history for member1
        resp2 = self.client.get(f'/api/payments/?member={self.member1.id}')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        results2 = resp2.data['results'] if isinstance(resp2.data, dict) and 'results' in resp2.data else resp2.data
        self.assertEqual(len(results2), 1)
        self.assertEqual(results2[0]['id'], p.id)

    def test_front_desk_cannot_delete_or_edit_payment(self):
        p = Payment.objects.create(
            subscription=self.sub1,
            amount=Decimal('15000.00'),
            method='cash',
            recorded_by=self.receptionist,
        )

        self.client.force_authenticate(user=self.receptionist)
        del_resp = self.client.delete(f'/api/payments/{p.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

        patch_resp = self.client.patch(f'/api/payments/{p.id}/', {'amount': '20000.00'})
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_payment_and_view_summary(self):
        p = Payment.objects.create(
            subscription=self.sub1,
            amount=Decimal('15000.00'),
            method='cash',
            recorded_by=self.receptionist,
        )

        self.client.force_authenticate(user=self.owner)
        summary_resp = self.client.get('/api/payments/summary/')
        self.assertEqual(summary_resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_revenue', summary_resp.data)

        del_resp = self.client.delete(f'/api/payments/{p.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Payment.objects.filter(id=p.id).exists())

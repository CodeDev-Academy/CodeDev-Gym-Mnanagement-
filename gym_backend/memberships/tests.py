from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import User
from attendance.models import CheckIn
from members.models import Member
from memberships.models import MembershipPlan, ReminderTemplate, Subscription


class ReminderEndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username='owner_user',
            password='Password123!',
            role='OWNER',
        )
        self.staff = User.objects.create_user(
            username='staff_user',
            password='Password123!',
            role='STAFF',
        )
        self.owner_token = Token.objects.create(user=self.owner)
        self.staff_token = Token.objects.create(user=self.staff)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')

        # Seed standard templates
        ReminderTemplate.objects.create(
            key='expiry_3d',
            title='Expiring Soon (3 Days)',
            body='Hi {name}, your {plan_name} expires in {days_left} days on {end_date}. Renew today!',
        )
        ReminderTemplate.objects.create(
            key='lapsed_7d',
            title='Lapsed 7-10 Days',
            body='Hi {name}, we miss seeing you! Your {plan_name} expired {days_left} days ago on {end_date}.',
        )
        ReminderTemplate.objects.create(
            key='lapsed_30d',
            title='Lapsed 30 Days',
            body='Hi {name}, don\'t lose momentum! It has been {days_left} days since your {plan_name} expired.',
        )
        ReminderTemplate.objects.create(
            key='lapsed_60d',
            title='Lapsed 60 Days',
            body='Hi {name}, fresh start! Your {plan_name} expired {days_left} days ago. Come back today.',
        )
        ReminderTemplate.objects.create(
            key='inactive_14d',
            title='14-Day Absent Active Member',
            body='Hi {name}, we noticed you haven\'t visited in {days_left} days! Your {plan_name} is active.',
        )

        self.plan = MembershipPlan.objects.create(
            name='Monthly Gold',
            price=25000,
            duration_days=30,
            is_active=True,
        )

        today = timezone.localdate()

        # Member 1: Expiring in 3 days
        self.m1 = Member.objects.create(full_name='Musa Dan', phone_number='08011112222', email='musa@test.com')
        self.sub_expiring_3d = Subscription.objects.create(
            member=self.m1,
            plan=self.plan,
            start_date=today - timedelta(days=27),
            end_date=today + timedelta(days=3),
            status='active',
            reminder_sent=False,
        )

        # Member 2: Lapsed 8 days ago
        self.m2 = Member.objects.create(full_name='Amina Bello', phone_number='2348022223333', email='amina@test.com')
        self.sub_lapsed_7d = Subscription.objects.create(
            member=self.m2,
            plan=self.plan,
            start_date=today - timedelta(days=38),
            end_date=today - timedelta(days=8),
            status='expired',
            lapsed_stage=0,
        )

        # Member 3: Lapsed 35 days ago
        self.m3 = Member.objects.create(full_name='Chidi Obi', phone_number='08033334444', email='chidi@test.com')
        self.sub_lapsed_30d = Subscription.objects.create(
            member=self.m3,
            plan=self.plan,
            start_date=today - timedelta(days=65),
            end_date=today - timedelta(days=35),
            status='expired',
            lapsed_stage=1,
        )

        # Member 4: Lapsed 65 days ago
        self.m4 = Member.objects.create(full_name='Grace Eke', phone_number='08044445555', email='grace@test.com')
        self.sub_lapsed_60d = Subscription.objects.create(
            member=self.m4,
            plan=self.plan,
            start_date=today - timedelta(days=95),
            end_date=today - timedelta(days=65),
            status='expired',
            lapsed_stage=2,
        )

        # Member 5: Active subscription, but absent 16 days
        self.m5 = Member.objects.create(
            full_name='David King',
            phone_number='08055556666',
            email='david@test.com',
            date_joined=today - timedelta(days=20),
        )
        self.sub_active_absent = Subscription.objects.create(
            member=self.m5,
            plan=self.plan,
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=10),
            status='active',
        )
        checkin = CheckIn.objects.create(member=self.m5)
        CheckIn.objects.filter(id=checkin.id).update(timestamp=timezone.now() - timedelta(days=16))

    def test_pending_reminders_view_counts_and_data(self):
        url = '/api/reminders/pending/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        counts = response.data['counts']
        self.assertEqual(counts['expiring_3d'], 1)
        self.assertEqual(counts['lapsed_7d'], 1)
        self.assertEqual(counts['lapsed_30d'], 1)
        self.assertEqual(counts['lapsed_60d'], 1)
        self.assertEqual(counts['inactive_14d'], 1)

        # Verify WhatsApp URL format
        categories = response.data['categories']
        m1_item = categories['expiring_3d'][0]
        self.assertIn('https://wa.me/2348011112222', m1_item['whatsapp_url'])
        self.assertIn('Renew%20today%21', m1_item['whatsapp_url'])
        self.assertEqual(m1_item['days_count'], 3)

        # Verify Nigerian phone prefix normalization in inactive member
        m5_item = categories['inactive_14d'][0]
        self.assertIn('https://wa.me/2348055556666', m5_item['whatsapp_url'])
        self.assertEqual(m5_item['days_count'], 16)

    def test_mark_reminders_sent(self):
        url = '/api/reminders/mark-sent/'

        # 1. Mark expiring_3d
        resp = self.client.post(url, {
            'category': 'expiring_3d',
            'subscription_ids': [self.sub_expiring_3d.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.sub_expiring_3d.refresh_from_db()
        self.assertTrue(self.sub_expiring_3d.reminder_sent)
        self.assertIsNotNone(self.sub_expiring_3d.reminder_sent_at)

        # 2. Mark lapsed_7d
        resp = self.client.post(url, {
            'category': 'lapsed_7d',
            'subscription_ids': [self.sub_lapsed_7d.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.sub_lapsed_7d.refresh_from_db()
        self.assertEqual(self.sub_lapsed_7d.lapsed_stage, 1)

        # 3. Mark lapsed_30d
        resp = self.client.post(url, {
            'category': 'lapsed_30d',
            'subscription_ids': [self.sub_lapsed_30d.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.sub_lapsed_30d.refresh_from_db()
        self.assertEqual(self.sub_lapsed_30d.lapsed_stage, 2)

        # 4. Mark lapsed_60d
        resp = self.client.post(url, {
            'category': 'lapsed_60d',
            'subscription_ids': [self.sub_lapsed_60d.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.sub_lapsed_60d.refresh_from_db()
        self.assertEqual(self.sub_lapsed_60d.lapsed_stage, 3)

        # 5. Mark inactive_14d
        resp = self.client.post(url, {
            'category': 'inactive_14d',
            'member_ids': [self.m5.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.m5.refresh_from_db()
        self.assertIsNotNone(self.m5.last_inactivity_reminder_at)

        # Confirm pending list is now empty for all categories
        pending_resp = self.client.get('/api/reminders/pending/')
        for cat, cnt in pending_resp.data['counts'].items():
            self.assertEqual(cnt, 0, f"Expected 0 for {cat}, got {cnt}")

    def test_expiring_soon_action_on_subscription_viewset(self):
        url = '/api/subscriptions/expiring-soon/?days=3'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['id'], self.sub_expiring_3d.id)

    def test_mark_reminded_action_on_subscription_viewset(self):
        url = f'/api/subscriptions/{self.sub_expiring_3d.id}/mark-reminded/'
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.sub_expiring_3d.refresh_from_db()
        self.assertTrue(self.sub_expiring_3d.reminder_sent)

    def test_reminder_template_permissions(self):
        template = ReminderTemplate.objects.get(key='expiry_3d')
        url = f'/api/reminders/templates/{template.id}/'

        # Owner can update template
        owner_resp = self.client.patch(url, {'body': 'Updated copy by owner.'}, format='json')
        self.assertEqual(owner_resp.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertEqual(template.body, 'Updated copy by owner.')

        # Staff user gets 403 Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')
        staff_resp = self.client.patch(url, {'body': 'Hacked by staff.'}, format='json')
        self.assertEqual(staff_resp.status_code, status.HTTP_403_FORBIDDEN)

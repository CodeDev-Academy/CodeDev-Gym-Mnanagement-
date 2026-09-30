from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from accounts.models import User
from members.models import Member
from memberships.models import MembershipPlan, Subscription
from payments.models import Payment


class RoleBasedAccessControlTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Owner
        self.owner = User.objects.create_user(
            username='gymowner',
            password='OwnerPassword123!',
            role='OWNER',
        )
        self.owner_token = Token.objects.create(user=self.owner)

        # Create Receptionist
        self.staff = User.objects.create_user(
            username='receptionist1',
            password='StaffPassword123!',
            role='FRONT_DESK',
        )
        self.staff_token = Token.objects.create(user=self.staff)

        # Create Sample Plan
        self.plan = MembershipPlan.objects.create(
            name='Monthly Standard',
            price=25000.00,
            duration_days=30,
            is_active=True,
        )

        # Create Sample Member
        self.member = Member.objects.create(
            full_name='Alice Wonderland',
            phone_number='+2348011223344',
            email='alice@example.com',
        )

    def test_receptionist_cannot_create_or_modify_plan(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')

        # 1. GET is allowed
        get_resp = self.client.get('/api/plans/')
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)

        # 2. POST is forbidden
        post_resp = self.client.post('/api/plans/', {
            'name': 'Hacked Cheap Plan',
            'price': 100.00,
            'duration_days': 30,
        }, format='json')
        self.assertEqual(post_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 3. PATCH is forbidden
        patch_resp = self.client.patch(f'/api/plans/{self.plan.id}/', {
            'price': 5000.00,
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

        # 4. DELETE is forbidden
        del_resp = self.client.delete(f'/api/plans/{self.plan.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_modify_plan(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        patch_resp = self.client.patch(f'/api/plans/{self.plan.id}/', {
            'price': 30000.00,
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.plan.refresh_from_db()
        self.assertEqual(float(self.plan.price), 30000.00)

    def test_receptionist_cannot_delete_member(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')

        # Receptionist CAN create or edit member
        edit_resp = self.client.patch(f'/api/members/{self.member.id}/', {
            'full_name': 'Alice Wonder Updated',
        }, format='json')
        self.assertEqual(edit_resp.status_code, status.HTTP_200_OK)

        # Receptionist CANNOT delete member
        del_resp = self.client.delete(f'/api/members/{self.member.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_member(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        del_resp = self.client.delete(f'/api/members/{self.member.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_receptionist_cannot_delete_payment_or_view_summary(self):
        # Create a payment
        sub = Subscription.objects.create(
            member=self.member,
            plan=self.plan,
            start_date='2026-09-01',
            end_date='2026-10-01',
            status='active',
        )
        pay = Payment.objects.create(
            subscription=sub,
            amount=25000.00,
            method='CASH',
            recorded_by=self.staff,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')

        # Summary is forbidden
        sum_resp = self.client.get('/api/payments/summary/')
        self.assertEqual(sum_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Deleting payment is forbidden
        del_resp = self.client.delete(f'/api/payments/{pay.id}/')
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_stats_hides_revenue_from_receptionist(self):
        # 1. Staff view
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')
        staff_resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(staff_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(staff_resp.data['metrics']['is_owner'])
        self.assertIsNone(staff_resp.data['metrics']['month_revenue'])
        self.assertIsNone(staff_resp.data['metrics']['today_revenue'])

        # 2. Owner view
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        owner_resp = self.client.get('/api/dashboard/stats/')
        self.assertEqual(owner_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(owner_resp.data['metrics']['is_owner'])
        self.assertIsNotNone(owner_resp.data['metrics']['month_revenue'])
        self.assertIsNotNone(owner_resp.data['metrics']['today_revenue'])

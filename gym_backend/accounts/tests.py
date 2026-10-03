from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from .models import User


class AccountsProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testowner',
            password='InitialPassword123!',
            first_name='Gym',
            last_name='Owner',
            email='owner@testgym.com',
            role='OWNER',
        )
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_get_profile_authenticated(self):
        url = reverse('user_profile')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testowner')
        self.assertEqual(response.data['role'], 'OWNER')
        self.assertTrue(response.data['is_owner'])
        self.assertEqual(response.data['full_name'], 'Gym Owner')

    def test_patch_profile(self):
        url = reverse('user_profile')
        payload = {
            'phone_number': '+2348012345678',
            'bio': 'Head Fitness Coach & Gym Director',
            'first_name': 'Chief',
            'last_name': 'Trainer',
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone_number'], '+2348012345678')
        self.assertEqual(response.data['bio'], 'Head Fitness Coach & Gym Director')
        self.assertEqual(response.data['full_name'], 'Chief Trainer')

        self.user.refresh_from_db()
        self.assertEqual(self.user.phone_number, '+2348012345678')
        self.assertEqual(self.user.bio, 'Head Fitness Coach & Gym Director')

    def test_change_password_success_and_reauth(self):
        url = reverse('change_password')
        payload = {
            'old_password': 'InitialPassword123!',
            'new_password': 'NewSecurePassword456#',
            'confirm_password': 'NewSecurePassword456#',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)

        # Test login with new password
        login_url = reverse('login')
        login_resp = self.client.post(login_url, {
            'username': 'testowner',
            'password': 'NewSecurePassword456#',
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

        # Old password should now fail
        old_login_resp = self.client.post(login_url, {
            'username': 'testowner',
            'password': 'InitialPassword123!',
        }, format='json')
        self.assertEqual(old_login_resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_invalid_old_password(self):
        url = reverse('change_password')
        payload = {
            'old_password': 'WrongPassword123!',
            'new_password': 'NewSecurePassword456#',
            'confirm_password': 'NewSecurePassword456#',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_mismatch(self):
        url = reverse('change_password')
        payload = {
            'old_password': 'InitialPassword123!',
            'new_password': 'NewSecurePassword456#',
            'confirm_password': 'DifferentPassword789#',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class StaffManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create Owner
        self.owner = User.objects.create_user(
            username='gymowner',
            password='OwnerPassword123!',
            first_name='Chief',
            last_name='Owner',
            role='OWNER',
        )
        self.owner_token = Token.objects.create(user=self.owner)

        # Create Receptionist
        self.staff = User.objects.create_user(
            username='receptionist1',
            password='StaffPassword123!',
            first_name='Sarah',
            last_name='Desk',
            role='FRONT_DESK',
        )
        self.staff_token = Token.objects.create(user=self.staff)

    def test_owner_can_list_staff(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('staff_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should only contain staff, not the owner
        usernames = [item['username'] for item in response.data]
        self.assertIn('receptionist1', usernames)
        self.assertNotIn('gymowner', usernames)

    def test_front_desk_cannot_list_staff(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.staff_token.key}')
        url = reverse('staff_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_create_staff(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('staff_list')
        payload = {
            'username': 'newstaff',
            'first_name': 'John',
            'last_name': 'Front',
            'email': 'john@gym.com',
            'phone_number': '+2348099887766',
            'password': 'NewStaffPassword123!',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'newstaff')
        self.assertEqual(response.data['role'], 'FRONT_DESK')

        created_user = User.objects.get(username='newstaff')
        self.assertEqual(created_user.role, 'FRONT_DESK')
        self.assertTrue(created_user.check_password('NewStaffPassword123!'))

    def test_owner_can_reset_staff_password(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('staff_reset_password', kwargs={'pk': self.staff.pk})
        payload = {
            'new_password': 'UpdatedStaffPass456#',
            'confirm_password': 'UpdatedStaffPass456#',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify staff can login with new password
        login_url = reverse('login')
        login_resp = self.client.post(login_url, {
            'username': 'receptionist1',
            'password': 'UpdatedStaffPass456#',
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

    def test_cannot_reset_owner_password_via_staff_endpoint(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        # Passing Owner's pk to staff reset endpoint must return 404
        url = reverse('staff_reset_password', kwargs={'pk': self.owner.pk})
        payload = {
            'new_password': 'HackedPassword789#',
            'confirm_password': 'HackedPassword789#',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_toggle_staff_status(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.owner_token.key}')
        url = reverse('staff_toggle_status', kwargs={'pk': self.staff.pk})

        # Deactivate
        resp1 = self.client.post(url)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.self_staff = User.objects.get(pk=self.staff.pk)
        self.assertFalse(self.self_staff.is_active)

        # Deactivated staff cannot login
        login_url = reverse('login')
        login_resp = self.client.post(login_url, {
            'username': 'receptionist1',
            'password': 'StaffPassword123!',
        }, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Re-activate
        resp2 = self.client.post(url)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.self_staff.refresh_from_db()
        self.assertTrue(self.self_staff.is_active)


class SetupAutomationBotCommandTests(TestCase):
    def test_setup_automation_bot_creates_user_and_token(self):
        from io import StringIO
        from django.core.management import call_command
        from rest_framework.authtoken.models import Token

        out = StringIO()
        call_command('setup_automation_bot', stdout=out)
        output = out.getvalue()

        self.assertIn('AUTOMATION BOT SERVICE ACCOUNT CONFIGURED', output)
        self.assertIn('Username    : automation_bot', output)

        bot_user = User.objects.get(username='automation_bot')
        self.assertEqual(bot_user.role, 'OWNER')
        self.assertTrue(bot_user.is_active)
        self.assertFalse(bot_user.has_usable_password())

        token = Token.objects.get(user=bot_user)
        self.assertIn(token.key, output)

        # Verify idempotency
        out2 = StringIO()
        call_command('setup_automation_bot', stdout=out2)
        self.assertIn('Retrieved existing token', out2.getvalue())



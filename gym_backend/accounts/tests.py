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

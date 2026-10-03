from django.test import TestCase
from rest_framework.exceptions import ValidationError as DRFValidationError
from .models import Member
from .serializers import MemberSerializer
from .utils import normalize_phone_number, validate_e164_phone


class PhoneNumberNormalizationTests(TestCase):
    def test_normalize_local_nigerian_number(self):
        self.assertEqual(normalize_phone_number('08012345678'), '+2348012345678')

    def test_normalize_country_coded_number_without_plus(self):
        self.assertEqual(normalize_phone_number('2348012345678'), '+2348012345678')

    def test_normalize_spaced_and_dashed_nigerian_number(self):
        self.assertEqual(normalize_phone_number('+234 803 123 4567'), '+2348031234567')
        self.assertEqual(normalize_phone_number('090-1122-3344'), '+2349011223344')

    def test_normalize_international_number(self):
        self.assertEqual(normalize_phone_number('+14155552671'), '+14155552671')

    def test_member_model_save_auto_normalizes_phone(self):
        member = Member.objects.create(
            full_name='Test Athlete',
            phone_number='08099887766',
            email='athlete@test.com',
        )
        member.refresh_from_db()
        self.assertEqual(member.phone_number, '+2348099887766')

    def test_member_serializer_validates_and_normalizes(self):
        data = {
            'full_name': 'New Member',
            'phone_number': '08022334455',
            'email': 'new@test.com',
        }
        serializer = MemberSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['phone_number'], '+2348022334455')

    def test_member_serializer_rejects_malformed_phone(self):
        data = {
            'full_name': 'Invalid Member',
            'phone_number': 'invalid-number',
            'email': 'inv@test.com',
        }
        serializer = MemberSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('phone_number', serializer.errors)

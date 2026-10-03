import re
from django.core.exceptions import ValidationError


def normalize_phone_number(raw_phone: str) -> str:
    """
    Sanitizes and normalizes phone numbers to standard E.164 international format (+234...).
    Handles:
      - Local Nigerian 11 digits: '08012345678' -> '+2348012345678'
      - Nigerian 13 digits without plus: '2348012345678' -> '+2348012345678'
      - Dashed / spaced: '0803 123 4567' or '090-1122-3344' -> '+2348031234567' / '+2349011223344'
      - Already E.164: '+2348012345678' -> '+2348012345678'
      - Other international E.164: '+14155552671' -> '+14155552671'
    """
    if not raw_phone:
        return ''

    # Remove all whitespace, dashes, dots, and parentheses
    cleaned = re.sub(r'[\s\-\(\)\.]', '', str(raw_phone).strip())
    if not cleaned:
        return ''

    # Extract digits only
    digits = re.sub(r'\D', '', cleaned)

    # 1. Nigerian local number: starts with '0' and is exactly 11 digits
    if cleaned.startswith('0') and len(digits) == 11:
        return f"+234{digits[1:]}"

    # 2. Nigerian country-coded without '+': starts with '234' and is 13 digits
    if digits.startswith('234') and len(digits) == 13:
        return f"+{digits}"

    # 3. Already starts with '+': return '+' followed by digits
    if cleaned.startswith('+') and len(digits) >= 8:
        return f"+{digits}"

    # 4. Fallback: if standard international length (10-15 digits) without '+', prepend '+'
    if 10 <= len(digits) <= 15:
        return f"+{digits}"

    return cleaned


def validate_e164_phone(phone: str):
    """
    Validates that a phone number is a valid canonical E.164 string (+ followed by 10-15 digits).
    Raises ValidationError if invalid.
    """
    normalized = normalize_phone_number(phone)
    digits = re.sub(r'\D', '', normalized)
    if not (normalized.startswith('+') and 10 <= len(digits) <= 15):
        raise ValidationError(
            "Enter a valid mobile phone number (e.g. 08012345678 or +2348012345678)."
        )
    return normalized

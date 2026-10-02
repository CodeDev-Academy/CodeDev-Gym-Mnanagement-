import urllib.parse
from .models import ReminderTemplate


def clean_phone(phone):
    """
    Sanitizes phone numbers into international E.164 digits without plus or leading zero.
    e.g. '08012345678' -> '2348012345678'
         '+2348012345678' -> '2348012345678'
    """
    raw = ''.join(c for c in str(phone or '') if c.isdigit())
    if raw.startswith('0') and len(raw) == 11:
        return '234' + raw[1:]
    return raw


def wa_url(phone, message):
    """
    Generates a direct WhatsApp click-to-chat URL with percent-encoded text.
    """
    cleaned = clean_phone(phone)
    encoded = urllib.parse.quote(message)
    return f"https://wa.me/{cleaned}?text={encoded}"


def render_template(key, fallback, **kwargs):
    """
    Retrieves the active ReminderTemplate by key and formats it with kwargs.
    Falls back to the provided fallback copy if template does not exist or fails formatting.
    """
    template = ReminderTemplate.objects.filter(key=key, is_active=True).first()
    raw_text = template.body if template else fallback
    try:
        return raw_text.format(**kwargs)
    except Exception:
        return fallback.format(**kwargs)

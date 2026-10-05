"""
Seeds 10 simulated gym member profiles into SQLite database for end-to-end browser agent testing.
"""
import os
import sys
from datetime import date, timedelta
from django.utils import timezone

sys.path.insert(0, os.path.abspath('gym_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from members.models import Member
from memberships.models import MembershipPlan, Subscription
from attendance.models import CheckIn

def seed_simulation():
    print("Seeding 10 test gym members across diverse life-cycle states...")
    
    plan_standard = MembershipPlan.objects.filter(name="Monthly Standard").first() or MembershipPlan.objects.first()
    plan_vip = MembershipPlan.objects.filter(name="VIP Monthly Pass").first() or plan_standard

    today = date.today()
    now = timezone.now()

    simulated_members = [
        {
            "full_name": "Chinedu Okafor",
            "phone_number": "+2348031110001",
            "email": "chinedu.okafor@example.com",
            "plan": plan_standard,
            "days_offset": -27,  # ends in 3 days (Pre-expiry reminder trigger!)
            "checkin_days_ago": 1,
        },
        {
            "full_name": "Amina Bello",
            "phone_number": "+2348031110002",
            "email": "amina.bello@example.com",
            "plan": plan_vip,
            "days_offset": -10,  # active
            "checkin_days_ago": 16, # Inactive 16 days (Rescue trigger!)
        },
        {
            "full_name": "Emeka Nwosu",
            "phone_number": "+2348031110003",
            "email": "emeka.nwosu@example.com",
            "plan": plan_standard,
            "days_offset": -38,  # expired 8 days ago (Lapsed 7d winback!)
            "checkin_days_ago": 40,
        },
        {
            "full_name": "Zainab Abubakar",
            "phone_number": "+2348031110004",
            "email": "zainab.abubakar@example.com",
            "plan": plan_standard,
            "days_offset": -62,  # expired 32 days ago (Lapsed 30d winback!)
            "checkin_days_ago": 65,
        },
        {
            "full_name": "Babajide Sanwo",
            "phone_number": "+2348031110005",
            "email": "babajide.sanwo@example.com",
            "plan": plan_standard,
            "days_offset": -91,  # expired 61 days ago (Lapsed 60d winback!)
            "checkin_days_ago": 95,
        },
        {
            "full_name": "Fatima Dangote",
            "phone_number": "+2348031110006",
            "email": "fatima.dangote@example.com",
            "plan": plan_vip,
            "days_offset": -5,   # newly enrolled active
            "checkin_days_ago": 0,  # checked in today
        },
        {
            "full_name": "Tunde Bakare",
            "phone_number": "+2348031110007",
            "email": "tunde.bakare@example.com",
            "plan": plan_standard,
            "days_offset": -12,  # active
            "checkin_days_ago": 2,  # regular athlete
        },
        {
            "full_name": "Ngozi Adeleke",
            "phone_number": "+2348031110008",
            "email": "ngozi.adeleke@example.com",
            "plan": plan_standard,
            "days_offset": -27,  # ends in 3 days (Pre-expiry reminder trigger!)
            "checkin_days_ago": 3,
        },
        {
            "full_name": "Kelechi Iheanacho",
            "phone_number": "+2348031110009",
            "email": "kelechi.iheanacho@example.com",
            "plan": plan_standard,
            "days_offset": -15,  # active
            "checkin_days_ago": 18, # Inactive 18 days (Rescue trigger!)
        },
        {
            "full_name": "Halima Usman",
            "phone_number": "+2348031110010",
            "email": "halima.usman@example.com",
            "plan": plan_standard,
            "days_offset": -20,  # active regular
            "checkin_days_ago": 0,  # checked in today
        }
    ]

    created_count = 0
    for data in simulated_members:
        member, _ = Member.objects.update_or_create(
            phone_number=data["phone_number"],
            defaults={
                "full_name": data["full_name"],
                "email": data["email"],
                "is_active": True
            }
        )
        plan = data["plan"]
        start_d = today + timedelta(days=data["days_offset"])
        end_d = start_d + timedelta(days=plan.duration_days)
        is_active = end_d >= today

        Subscription.objects.update_or_create(
            member=member,
            defaults={
                "plan": plan,
                "start_date": start_d,
                "end_date": end_d,
                "status": "active" if is_active else "expired",
                "reminder_sent": False
            }
        )

        if data["checkin_days_ago"] is not None:
            checkin_time = now - timedelta(days=data["checkin_days_ago"])
            CheckIn.objects.create(
                member=member,
                timestamp=checkin_time
            )
        created_count += 1

    print(f"Successfully seeded/updated {created_count} members with realistic life-cycle records!")

if __name__ == '__main__':
    seed_simulation()

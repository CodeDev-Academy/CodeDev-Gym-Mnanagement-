import os
import sys
from datetime import timedelta
import django

# Setup Django environment
sys.path.insert(0, os.path.abspath('gym_backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from accounts.models import User
from members.models import Member
from memberships.models import MembershipPlan, Subscription, ReminderTemplate
from payments.models import Payment
from attendance.models import CheckIn
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

def run_10_personas_simulation():
    print("Starting 10-persona end-to-end simulation...")
    
    # 1. Authenticate as Admin / Owner
    admin_user = User.objects.get(username='admin')
    token, _ = Token.objects.get_or_create(user=admin_user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    
    today = timezone.localdate()
    plan_standard = MembershipPlan.objects.filter(is_active=True).first()
    plan_vip = MembershipPlan.objects.filter(is_active=True).last()
    
    # Clean previous simulation test members if any
    Member.objects.filter(phone_number__startswith='+2349000000').delete()
    
    personas = [
        {
            "name": "Kunle Adebayo",
            "phone": "+2349000000001",
            "email": "kunle@example.com",
            "action": "New member, standard plan, cash payment, active check-in today",
            "setup": "active_today"
        },
        {
            "name": "Zainab Mohammed",
            "phone": "+2349000000002",
            "email": "zainab@example.com",
            "action": "New member, VIP plan, transfer payment, active check-in today",
            "setup": "active_today_vip"
        },
        {
            "name": "Nnamdi Kanu",
            "phone": "+2349000000003",
            "email": "nnamdi@example.com",
            "action": "New member, standard plan, POS card payment, no check-in yet",
            "setup": "active_fresh"
        },
        {
            "name": "Fatima Bello",
            "phone": "+2349000000004",
            "email": "fatima@example.com",
            "action": "Pass expiring in 2 days (target for Expiring Soon 3-Day tab)",
            "setup": "expiring_2d"
        },
        {
            "name": "Osagie Ighodalo",
            "phone": "+2349000000005",
            "email": "osagie@example.com",
            "action": "Pass expired 8 days ago (target for Lapsed Stage 1 7-14 Day tab)",
            "setup": "lapsed_8d"
        },
        {
            "name": "Bolanle Austen",
            "phone": "+2349000000006",
            "email": "bolanle@example.com",
            "action": "Pass expired 32 days ago (target for Lapsed Stage 2 Month 2 tab)",
            "setup": "lapsed_32d"
        },
        {
            "name": "Chukwudi Nzeogwu",
            "phone": "+2349000000007",
            "email": "chukwudi@example.com",
            "action": "Pass expired 63 days ago (target for Lapsed Stage 3 Month 3 tab)",
            "setup": "lapsed_63d"
        },
        {
            "name": "Aisha Yesufu",
            "phone": "+2349000000008",
            "email": "aisha@example.com",
            "action": "Active member, absent for 18 days (target for 14+ Days Absent tab)",
            "setup": "inactive_18d"
        },
        {
            "name": "Tariq Danjuma",
            "phone": "+2349000000009",
            "email": "tariq@example.com",
            "action": "Registered member prospect, no subscription yet",
            "setup": "prospect"
        },
        {
            "name": "Ebele Okonkwo",
            "phone": "+2349000000010",
            "email": "ebele@example.com",
            "action": "New member, quarterly plan, multi-day check-in history",
            "setup": "regular_trainer"
        }
    ]
    
    for idx, p in enumerate(personas, 1):
        # 1. Create Member
        m = Member.objects.create(
            full_name=p["name"],
            phone_number=p["phone"],
            email=p["email"],
            date_joined=today - timedelta(days=25 if p["setup"] == "inactive_18d" else 10),
            is_active=True
        )
        print(f"[{idx}/10] Created Member: {m.full_name} ({p['setup']})")
        
        # 2. Setup subscription & payments based on persona
        if p["setup"] == "active_today":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_standard,
                start_date=today - timedelta(days=5),
                end_date=today + timedelta(days=25),
                status='active',
                reminder_sent=False
            )
            Payment.objects.create(
                subscription=sub,
                amount=plan_standard.price,
                method='cash',
                recorded_by=admin_user
            )
            ci = CheckIn.objects.create(member=m)
            print(f"       -> Assigned Standard plan, logged Cash payment, recorded check-in.")
            
        elif p["setup"] == "active_today_vip":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_vip,
                start_date=today - timedelta(days=2),
                end_date=today + timedelta(days=28),
                status='active',
                reminder_sent=False
            )
            Payment.objects.create(
                subscription=sub,
                amount=plan_vip.price,
                method='bank_transfer',
                recorded_by=admin_user
            )
            CheckIn.objects.create(member=m)
            print(f"       -> Assigned VIP plan, logged Bank Transfer, recorded check-in.")
            
        elif p["setup"] == "active_fresh":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_standard,
                start_date=today,
                end_date=today + timedelta(days=30),
                status='active',
                reminder_sent=False
            )
            Payment.objects.create(
                subscription=sub,
                amount=plan_standard.price,
                method='card',
                recorded_by=admin_user
            )
            print(f"       -> Assigned Standard plan, logged POS Card payment.")
            
        elif p["setup"] == "expiring_2d":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_standard,
                start_date=today - timedelta(days=28),
                end_date=today + timedelta(days=2),
                status='active',
                reminder_sent=False
            )
            Payment.objects.create(
                subscription=sub,
                amount=plan_standard.price,
                method='cash',
                recorded_by=admin_user
            )
            print(f"       -> Set pass expiring in 2 days (ends {sub.end_date}).")
            
        elif p["setup"] == "lapsed_8d":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_standard,
                start_date=today - timedelta(days=38),
                end_date=today - timedelta(days=8),
                status='expired',
                lapsed_stage=0
            )
            print(f"       -> Set pass lapsed 8 days ago (expired {sub.end_date}).")
            
        elif p["setup"] == "lapsed_32d":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_vip,
                start_date=today - timedelta(days=62),
                end_date=today - timedelta(days=32),
                status='expired',
                lapsed_stage=1
            )
            print(f"       -> Set pass lapsed 32 days ago (expired {sub.end_date}).")
            
        elif p["setup"] == "lapsed_63d":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_standard,
                start_date=today - timedelta(days=93),
                end_date=today - timedelta(days=63),
                status='expired',
                lapsed_stage=2
            )
            print(f"       -> Set pass lapsed 63 days ago (expired {sub.end_date}).")
            
        elif p["setup"] == "inactive_18d":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_standard,
                start_date=today - timedelta(days=25),
                end_date=today + timedelta(days=15),
                status='active'
            )
            ci = CheckIn.objects.create(member=m)
            CheckIn.objects.filter(id=ci.id).update(timestamp=timezone.now() - timedelta(days=18))
            print(f"       -> Set active pass, absent for 18 days.")
            
        elif p["setup"] == "prospect":
            print(f"       -> Registered prospect without subscription.")
            
        elif p["setup"] == "regular_trainer":
            sub = Subscription.objects.create(
                member=m,
                plan=plan_vip,
                start_date=today - timedelta(days=10),
                end_date=today + timedelta(days=80),
                status='active'
            )
            Payment.objects.create(
                subscription=sub,
                amount=plan_vip.price,
                method='bank_transfer',
                recorded_by=admin_user
            )
            CheckIn.objects.create(member=m)
            print(f"       -> Assigned plan, logged payment, active check-in.")

    # 3. Test GET /api/reminders/pending/ API endpoint
    print("\nQuerying /api/reminders/pending/ endpoint...")
    resp = client.get('/api/reminders/pending/')
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    
    counts = resp.data['counts']
    print(f"Pending Reminders API Counts:")
    print(f" - Expiring Soon (3 Days): {counts['expiring_3d']}")
    print(f" - Lapsed (7-14 Days):     {counts['lapsed_7d']}")
    print(f" - Lapsed (30-45 Days):    {counts['lapsed_30d']}")
    print(f" - Lapsed (60-75 Days):    {counts['lapsed_60d']}")
    print(f" - 14+ Days Absent Active: {counts['inactive_14d']}")
    
    categories = resp.data['categories']
    for cat_name, items in categories.items():
        if items:
            sample = items[0]
            print(f"\nSample message for [{cat_name}]:")
            print(f" -> Member: {sample['member_name']} ({sample['phone_number']})")
            print(f" -> Days:   {sample['days_count']}")
            print(f" -> Message: {sample['prepared_message'][:100]}...")
            print(f" -> WhatsApp URL: {sample['whatsapp_url'][:75]}...")
            
    print("\n10-Persona End-to-End Simulation successfully completed!")

if __name__ == '__main__':
    run_10_personas_simulation()

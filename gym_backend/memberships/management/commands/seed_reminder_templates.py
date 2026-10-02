from django.core.management.base import BaseCommand
from memberships.models import ReminderTemplate


class Command(BaseCommand):
    help = 'Seeds initial reminder message templates into the database'

    def handle(self, *args, **options):
        templates = [
            {
                'key': 'welcome_sub',
                'title': 'Instant Subscription Welcome & Receipt',
                'body': (
                    "Welcome to Abuja Gym, {name}! Your {plan_name} subscription is active "
                    "until {end_date}. Receipt Amount: NGN {price}. See you on the gym floor!"
                ),
            },
            {
                'key': 'expiry_3d',
                'title': 'Pre-Expiry Reminder (3 Days Left)',
                'body': (
                    "Hi {name}, you have built great momentum with your workouts at Abuja Gym! "
                    "Just a gentle heads-up that your {plan_name} pass ends in 3 days on {end_date}. "
                    "We want to make sure your training routine stays smooth and uninterrupted so you "
                    "keep hitting your personal fitness goals. Keep up the strong work!"
                ),
            },
            {
                'key': 'lapsed_7d',
                'title': 'Lapsed Stage 1 (7 Days After Expiry)',
                'body': (
                    "Hi {name}, we really miss your energy on the gym floor this past week! Life and "
                    "work get busy, but your health and self-care always matter. Whether you needed a "
                    "few rest days or got caught up with commitments, remember that it only takes one "
                    "session to get that incredible post-workout feeling back. We are right in your "
                    "corner whenever you are ready to pick up where you left off!"
                ),
            },
            {
                'key': 'lapsed_30d',
                'title': 'Lapsed Stage 2 (30 Days After Expiry / Month 2)',
                'body': (
                    "Hi {name}, remember the commitment and sweat you put in during your first month? "
                    "You proved to yourself what you are capable of. It is completely normal to fall "
                    "out of rhythm, but your fitness goals are still within reach. Do not let your "
                    "hard-earned progress fade away—take that first step back today, even if it is just "
                    "a 30-minute workout!"
                ),
            },
            {
                'key': 'lapsed_60d',
                'title': 'Lapsed Stage 3 (60 Days After Expiry / Month 3)',
                'body': (
                    "Hi {name}, it has been a little while, and we wanted to remind you that your "
                    "fitness journey is never all-or-nothing. There is zero judgment here—whenever you "
                    "are ready for a clean slate, our entire community is here to welcome you back and "
                    "help you feel strong and energized again. You did it before, and you can do it again!"
                ),
            },
            {
                'key': 'inactive_14d',
                'title': 'Active Pass Inactivity Check (14+ Days Absent)',
                'body': (
                    "Hi {name}, we noticed you haven't been in for a workout over the last two weeks. "
                    "Life gets busy, but don't lose that hard-earned momentum! Your workout community "
                    "at Abuja Gym is here to support you whenever you're ready to get back on the floor."
                ),
            },
        ]

        created_count = 0
        updated_count = 0
        for item in templates:
            obj, created = ReminderTemplate.objects.get_or_create(
                key=item['key'],
                defaults={'title': item['title'], 'body': item['body'], 'is_active': True},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded reminder templates. Created: {created_count}, Existing: {updated_count}"
            )
        )

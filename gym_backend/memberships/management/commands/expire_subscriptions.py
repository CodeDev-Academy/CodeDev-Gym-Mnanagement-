from django.core.management.base import BaseCommand
from django.utils import timezone
from memberships.models import Subscription


class Command(BaseCommand):
    help = (
        "Idempotently scans for active subscriptions whose end_date has passed "
        "and updates their status to 'expired'."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Override evaluation date (ISO format YYYY-MM-DD) for simulation.',
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            import datetime
            try:
                today = datetime.date.fromisoformat(date_str)
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid date format '{date_str}'. Use YYYY-MM-DD."))
                return
        else:
            today = timezone.localdate()

        expired_qs = Subscription.objects.filter(
            status='active',
            end_date__lt=today,
        )
        count = expired_qs.count()
        updated = expired_qs.update(status='expired')

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully marked {updated} overdue subscription(s) as 'expired' (as of {today})."
            )
        )


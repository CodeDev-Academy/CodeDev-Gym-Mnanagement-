from django.db import models
from members.models import Member


class CheckIn(models.Model):
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='check_ins',
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'check_in'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['member', 'timestamp'], name='checkin_member_time_idx'),
        ]

    def __str__(self):
        return f"Check-in: {self.member.full_name} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"

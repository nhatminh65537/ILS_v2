"""Mark expired challenge instances as terminated (optional active sweep).

Lazy expiry (in ChallengeService.get_running_instance) already handles instances when a
user next touches them. This command lets an operator sweep the whole DB on a schedule
(OS cron) so instances are reconciled even without user activity. The deploy server's
own reaper is what actually removes the containers; this only syncs ILS DB state.

Usage:
    python manage.py reap_instances
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import ChallengeInstance


class Command(BaseCommand):
    help = 'Mark running challenge instances past their TTL as terminated.'

    def handle(self, *args, **options):
        now = timezone.now()
        expired = ChallengeInstance.objects.filter(
            status=ChallengeInstance.InstanceStatus.RUNNING,
            expires_at__isnull=False,
            expires_at__lte=now,
        )
        count = 0
        for instance in expired:
            instance.status = ChallengeInstance.InstanceStatus.TERMINATED
            instance.terminated_at = now
            instance.save(update_fields=['status', 'terminated_at', 'updated_at'])
            instance.log('Instance expired (TTL, reap_instances sweep)')
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Reaped {count} expired instance(s).'))

"""Mark expired challenge instances as terminated (active sweep).

Lazy expiry (in ChallengeService.get_running_instance) already handles instances when a
user next touches them. This command sweeps the whole DB on a schedule so instances are
reconciled even without user activity, and asks the deploy backend to remove the real
container (no-op for the Mock backend).

Schedule it from the OS:
    # Linux cron — every minute
    * * * * * cd /path/to/backend && /path/to/.venv/bin/python manage.py reap_instances

    # Windows Task Scheduler — run reap_instances.py via the project venv on a 1-min trigger.

For a single-process dev setup you can instead run it as a foreground loop:
    python manage.py reap_instances --loop --interval 60

Note: keep the sweep interval below ``challenge.instance_extend_threshold_minutes`` so the
admin UI and the partial-unique-index stay reasonably fresh.
"""
import time

from django.core.management.base import BaseCommand

from api.services.challenge_service import ChallengeService


class Command(BaseCommand):
    help = 'Terminate running challenge instances past their TTL (active sweep).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loop',
            action='store_true',
            help='Run continuously, sweeping every --interval seconds (dev/single-process only).',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Seconds between sweeps when --loop is set (default 60).',
        )

    def _sweep_once(self):
        terminated, errors = ChallengeService.reap_expired_instances()
        msg = f'Reaped {terminated} expired instance(s).'
        if errors:
            msg += f' {errors} deploy terminate error(s) (DB still marked terminated).'
        self.stdout.write(self.style.SUCCESS(msg))

    def handle(self, *args, **options):
        if not options.get('loop'):
            self._sweep_once()
            return

        interval = max(1, int(options.get('interval') or 60))
        self.stdout.write(self.style.WARNING(f'reap_instances loop started (every {interval}s). Ctrl+C to stop.'))
        try:
            while True:
                self._sweep_once()
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('reap_instances loop stopped.'))

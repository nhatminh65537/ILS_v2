"""Convert legacy STOPPED challenge instances to TERMINATED.

The STOPPED status was a half-dead middle state: ``get_running_instance`` only
matched RUNNING, so a STOPPED instance could never be resumed and starting again
spawned a new instance. The user "Stop" action now terminates instead, so the
STOPPED value is deprecated. This migration normalises any existing STOPPED rows
to TERMINATED (setting ``terminated_at`` when missing) so the data matches the
new semantics. Written against historical model state; idempotent.
"""

from django.db import migrations
from django.utils import timezone


def terminate_stopped(apps, schema_editor):
    ChallengeInstance = apps.get_model('api', 'ChallengeInstance')
    now = timezone.now()
    for instance in ChallengeInstance.objects.filter(status='stopped'):
        instance.status = 'terminated'
        if instance.terminated_at is None:
            instance.terminated_at = instance.updated_at or now
        instance.save(update_fields=['status', 'terminated_at', 'updated_at'])


def noop_reverse(apps, schema_editor):
    # STOPPED is deprecated; do not recreate it on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_config_outline_learn_and_deploy_socket'),
    ]

    operations = [
        migrations.RunPython(terminate_stopped, noop_reverse),
    ]

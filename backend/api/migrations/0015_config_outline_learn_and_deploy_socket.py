"""Data migration: re-home outline.* config under the ``learn`` group and flip
the default deploy backend to ``socket`` (enabled) for existing installs.

- outline.enabled / outline.url / outline.api_token: category 'outline' -> 'learn'
  (config grouping is driven by the ``category`` field; Outline belongs to Learn).
- challenge.deploy.provider: 'mock' -> 'socket' and challenge.deploy.enabled: False
  -> True, but ONLY when the row is still at the previous default — we must not
  clobber a value an operator deliberately changed.

Idempotent and written against historical model state (no live service imports).
The admin still configures challenge.deploy.api_url / api_token by hand.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    SystemConfig = apps.get_model('api', 'SystemConfig')

    # 1) outline.* -> learn group
    SystemConfig.objects.filter(key__startswith='outline.').update(category='learn')

    # 2) deploy provider mock -> socket (only if still the old default)
    SystemConfig.objects.filter(
        key='challenge.deploy.provider', value='mock'
    ).update(value='socket')

    # 3) deploy enabled False -> True (only if still the old default)
    SystemConfig.objects.filter(
        key='challenge.deploy.enabled', value=False
    ).update(value=True)


def backwards(apps, schema_editor):
    SystemConfig = apps.get_model('api', 'SystemConfig')
    SystemConfig.objects.filter(key__startswith='outline.').update(category='outline')
    SystemConfig.objects.filter(
        key='challenge.deploy.provider', value='socket'
    ).update(value='mock')
    SystemConfig.objects.filter(
        key='challenge.deploy.enabled', value=True
    ).update(value=False)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_challenge_deploy_source_ref'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]

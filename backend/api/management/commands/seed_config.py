import os

from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import SystemConfig


# Outline integration values are sourced from the environment (.env) so secrets
# are never committed to the repo. When both URL and token are present, the
# integration is enabled by default.
_OUTLINE_URL = (os.environ.get('OUTLINE_URL', '') or '').strip()
_OUTLINE_API_TOKEN = (os.environ.get('OUTLINE_API_TOKEN', '') or '').strip()
_OUTLINE_ENABLED = bool(_OUTLINE_URL and _OUTLINE_API_TOKEN)

# GitLab challenge-sync values are likewise sourced from the environment (.env)
# so the access token is never committed. When both URL and token are present,
# the integration is enabled by default. Use a read-only Group Access Token
# (scopes read_api + read_repository) — see docs/CONFIG.md §challenge.git.
_GITLAB_URL = (os.environ.get('GITLAB_URL', '') or '').strip()
_GITLAB_TOKEN = (os.environ.get('GITLAB_TOKEN', '') or '').strip()
_GITLAB_ENABLED = bool(_GITLAB_URL and _GITLAB_TOKEN)


DEFAULT_CONFIGS = [
    {
        'key': 'auth.local_login_enabled',
        'value': True,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Enable native username/password login. Set false to force SSO-only.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.registration_enabled',
        'value': True,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Allow self-registration via local sign-up form.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.password_reset_enabled',
        'value': True,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Allow users to request password reset email.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.sso_enabled',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Enable SSO login via Authentik OAuth2.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.sso_base_url',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'auth',
        'description': 'Authentik instance base URL (no trailing slash).',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.sso_client_id',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'auth',
        'description': 'OAuth2 client id in Authentik.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.sso_client_secret',
        'value': '',
        'value_type': SystemConfig.ConfigType.SECRET,
        'category': 'auth',
        'description': 'OAuth2 client secret in Authentik.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.link_accounts_enabled',
        'value': True,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Allow linking SSO identity with local account.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.authorization_enabled',
        'value': True,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Enable RBAC permission checks. Dev-only disable toggle.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.password.min_length',
        'value': 8,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'auth',
        'description': 'Minimum password length.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.password.require_uppercase',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Require uppercase character in password.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.password.require_number',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Require number in password.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.password.require_special',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Require special character in password.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.email.host',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'auth',
        'description': 'SMTP host name.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.email.port',
        'value': 587,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'auth',
        'description': 'SMTP port.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.email.use_tls',
        'value': True,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'auth',
        'description': 'Use STARTTLS for SMTP connection.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.email.username',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'auth',
        'description': 'SMTP authentication username.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.email.password',
        'value': '',
        'value_type': SystemConfig.ConfigType.SECRET,
        'category': 'auth',
        'description': 'SMTP authentication password.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.email.sender_name',
        'value': 'ILS Platform',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'auth',
        'description': 'From display name for outgoing emails.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.email.sender_address',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'auth',
        'description': 'From email address for outgoing emails.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'auth.token.access_ttl',
        'value': 15,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'auth',
        'description': 'Access token TTL in minutes.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'auth.token.refresh_ttl',
        'value': 10080,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'auth',
        'description': 'Refresh token TTL in minutes.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'learn.max_tree_depth',
        'value': 5,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'learn',
        'description': 'Maximum folder nesting depth in course tree.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'learn.max_nodes_per_course',
        'value': 500,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'learn',
        'description': 'Maximum nodes per course.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'outline.enabled',
        'value': _OUTLINE_ENABLED,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'outline',
        'description': 'Enable Outline integration.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'outline.url',
        'value': _OUTLINE_URL,
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'outline',
        'description': 'Outline base URL.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'outline.api_token',
        'value': _OUTLINE_API_TOKEN,
        'value_type': SystemConfig.ConfigType.SECRET,
        'category': 'outline',
        'description': 'Outline API token.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'challenge.upload_path',
        'value': 'uploads/challenges',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'challenge',
        'description': 'Upload path for challenge attachments.',
        'is_editable': False,
        'is_runtime': False,
    },
    {
        'key': 'challenge.instance_ttl_minutes',
        'value': 60,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'challenge',
        'description': 'Default challenge instance TTL in minutes.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'challenge.max_tree_depth',
        'value': 5,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'challenge',
        'description': 'Maximum folder nesting depth in the challenge tree.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'quiz.max_tree_depth',
        'value': 5,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'quiz',
        'description': 'Maximum folder nesting depth in the quiz tree.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'challenge.deploy.enabled',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'challenge',
        'description': 'Enable deployable challenge feature.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'challenge.deploy.api_url',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'challenge',
        'description': 'Deployment API base URL.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'challenge.deploy.api_token',
        'value': '',
        'value_type': SystemConfig.ConfigType.SECRET,
        'category': 'challenge',
        'description': 'Deployment API token.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'challenge.git.enabled',
        'value': _GITLAB_ENABLED,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'challenge',
        'description': 'Enable GitLab challenge sync.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'challenge.git.url',
        'value': _GITLAB_URL,
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'challenge',
        'description': 'GitLab instance base URL (no trailing slash).',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'challenge.git.token',
        'value': _GITLAB_TOKEN,
        'value_type': SystemConfig.ConfigType.SECRET,
        'category': 'challenge',
        'description': 'GitLab access token (PAT or read-only Group Access Token; scopes read_api + read_repository).',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'cdn.enabled',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'cdn',
        'description': 'Enable CDN for static/media assets.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'cdn.endpoint',
        'value': '',
        'value_type': SystemConfig.ConfigType.STRING,
        'category': 'cdn',
        'description': 'CDN base URL.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'cdn.auth_token',
        'value': '',
        'value_type': SystemConfig.ConfigType.SECRET,
        'category': 'cdn',
        'description': 'CDN authentication token.',
        'is_editable': True,
        'is_runtime': False,
    },
    {
        'key': 'system.maintenance_mode',
        'value': False,
        'value_type': SystemConfig.ConfigType.BOOL,
        'category': 'system',
        'description': 'Maintenance mode toggle.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'system.rate_limit.login',
        'value': 10,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'system',
        'description': 'Max login attempts per minute per IP.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'system.rate_limit.api',
        'value': 120,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'system',
        'description': 'Max API requests per minute per authenticated user.',
        'is_editable': True,
        'is_runtime': True,
    },
    {
        'key': 'system.rate_limit.flag_submit',
        'value': 10,
        'value_type': SystemConfig.ConfigType.INT,
        'category': 'system',
        'description': 'Max flag submissions per minute per user.',
        'is_editable': True,
        'is_runtime': True,
    },
]


SYNC_FIELDS = (
    'value',
    'value_type',
    'category',
    'description',
    'is_editable',
    'is_runtime',
)


class Command(BaseCommand):
    help = 'Seed canonical system configuration keys into system_config table.'

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0
        unchanged_count = 0

        for config in DEFAULT_CONFIGS:
            obj, created = SystemConfig.objects.get_or_create(
                key=config['key'],
                defaults=config,
            )

            if created:
                created_count += 1
                continue

            changed_fields = []
            for field in SYNC_FIELDS:
                # Never clobber an already-configured value with an empty seed
                # default (e.g. Outline url/token left out of the environment on a
                # re-seed). Metadata fields still sync normally.
                if field == 'value' and config[field] in ('', None) and obj.value not in ('', None):
                    continue
                if getattr(obj, field) != config[field]:
                    setattr(obj, field, config[field])
                    changed_fields.append(field)

            if changed_fields:
                obj.save(update_fields=[*changed_fields, 'updated_at'])
                updated_count += 1
            else:
                unchanged_count += 1

        total = len(DEFAULT_CONFIGS)
        self.stdout.write(self.style.SUCCESS('System configuration seed completed.'))
        self.stdout.write(f'Total canonical keys: {total}')
        self.stdout.write(f'Created: {created_count}')
        self.stdout.write(f'Updated: {updated_count}')
        self.stdout.write(f'Unchanged: {unchanged_count}')

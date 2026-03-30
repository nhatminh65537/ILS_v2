import logging
import os
import sys

from django.apps import AppConfig


LOGGER = logging.getLogger(__name__)
DISCOVERY_RAN = False


class AuthAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auth_app'

    def ready(self):
        global DISCOVERY_RAN
        if DISCOVERY_RAN:
            return
        if os.environ.get('AUTHZ_DISCOVERY_DISABLED') == '1':
            return
        if _should_skip_discovery_for_command():
            return

        DISCOVERY_RAN = True
        strict_mode = os.environ.get('AUTHZ_DISCOVERY_STRICT') == '1'

        try:
            from auth_app.services.permission_discovery import discover_permissions

            discover_permissions()
        except Exception:
            LOGGER.exception('AUTHZ-DISCOVERY failed during app startup')
            if strict_mode:
                raise


def _should_skip_discovery_for_command() -> bool:
    command_line = ' '.join(sys.argv).lower()
    skip_markers = ['pytest', 'test', 'migrate', 'makemigrations', 'collectstatic', 'check']
    return any(marker in command_line for marker in skip_markers)

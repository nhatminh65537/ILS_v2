import logging
import os

from django.core.mail import EmailMultiAlternatives, get_connection

from api.utils import get_config


LOGGER = logging.getLogger(__name__)

CONSOLE_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SMTP_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

DEFAULT_SENDER_NAME = 'ILS Platform'


def _env_or_config(env_key: str, config_key: str, default=None):
    """Env wins over runtime ``system_config``; empty env string is ignored."""
    raw = os.environ.get(env_key)
    if raw is not None and raw != '':
        return raw
    return get_config(config_key, default)


def _as_bool(value, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    if value is None:
        return default
    return bool(value)


class EmailService:
    """Send transactional email via a dynamically-built backend.

    SMTP settings are resolved fresh on every send (env first, then runtime
    ``auth.email.*`` config). When no SMTP host is configured the service falls
    back to Django's console backend so the dev flow still works (the message,
    including reset links, prints to the server console).
    """

    def _resolve_smtp_settings(self):
        host = _env_or_config('EMAIL_HOST', 'auth.email.host', '')
        if not host:
            return None

        port_raw = _env_or_config('EMAIL_PORT', 'auth.email.port', 587)
        try:
            port = int(port_raw)
        except (TypeError, ValueError):
            port = 587

        sender_address = _env_or_config('EMAIL_SENDER_ADDRESS', 'auth.email.sender_address', '')
        username = _env_or_config('EMAIL_HOST_USER', 'auth.email.username', '')

        return {
            'host': host,
            'port': port,
            'use_tls': _as_bool(_env_or_config('EMAIL_USE_TLS', 'auth.email.use_tls', True), True),
            'username': username,
            'password': _env_or_config('EMAIL_HOST_PASSWORD', 'auth.email.password', '') or '',
            'sender_address': sender_address or username,
            'sender_name': get_config('auth.email.sender_name', DEFAULT_SENDER_NAME) or DEFAULT_SENDER_NAME,
        }

    def _build_connection(self, smtp):
        if smtp is None:
            return get_connection(CONSOLE_BACKEND), None

        connection = get_connection(
            SMTP_BACKEND,
            host=smtp['host'],
            port=smtp['port'],
            username=smtp['username'] or None,
            password=smtp['password'] or None,
            use_tls=smtp['use_tls'],
        )
        return connection, smtp

    def _from_email(self, smtp) -> str:
        name = (smtp or {}).get('sender_name', DEFAULT_SENDER_NAME)
        address = (smtp or {}).get('sender_address', '') or 'noreply@localhost'
        return f'{name} <{address}>'

    def send_password_reset_email(self, user, reset_link: str) -> bool:
        """Send a reset link to ``user.email``. Never raises — returns success bool."""
        if not user.email:
            return False

        smtp = self._resolve_smtp_settings()

        subject = 'Reset your ILS password'
        text_body = (
            f'Hi {user.username},\n\n'
            'We received a request to reset your ILS account password.\n'
            f'Click the link below to choose a new password (valid for 1 hour):\n\n'
            f'{reset_link}\n\n'
            "If you didn't request this, you can safely ignore this email — your "
            'password will not be changed.\n'
        )
        html_body = (
            f'<p>Hi {user.username},</p>'
            '<p>We received a request to reset your ILS account password.</p>'
            f'<p><a href="{reset_link}">Reset your password</a> (valid for 1 hour).</p>'
            "<p>If you didn't request this, you can safely ignore this email — "
            'your password will not be changed.</p>'
        )

        try:
            connection, smtp = self._build_connection(smtp)
            message = EmailMultiAlternatives(
                subject=subject,
                body=text_body,
                from_email=self._from_email(smtp),
                to=[user.email],
                connection=connection,
            )
            message.attach_alternative(html_body, 'text/html')
            message.send(fail_silently=False)
            return True
        except Exception:  # noqa: BLE001 — email failure must never break the request
            LOGGER.exception('Failed to send password reset email to user_id=%s', user.pk)
            return False

import logging

from django.core.mail import EmailMultiAlternatives, get_connection

from api.utils import get_config


LOGGER = logging.getLogger(__name__)

SMTP_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

DEFAULT_SENDER_NAME = 'ILS Platform'


def _as_bool(value, default: bool = True) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    if value is None:
        return default
    return bool(value)


class EmailService:
    """Send transactional email using SMTP settings from ``system_config``.

    Configuration lives **exclusively** in the ``auth.email.*`` config rows
    (centralized management — env is not consulted at runtime; `.env` only
    bootstraps those rows via ``seed_config``). Settings are read fresh on every
    send so admin edits take effect immediately. When no SMTP host is configured
    the service does NOT send (and does not fall back to a console backend);
    callers treat that as "email not configured".
    """

    def _resolve_smtp_settings(self):
        host = (get_config('auth.email.host', '') or '').strip()
        if not host:
            return None

        try:
            port = int(get_config('auth.email.port', 587) or 587)
        except (TypeError, ValueError):
            port = 587

        username = (get_config('auth.email.username', '') or '').strip()
        sender_address = (get_config('auth.email.sender_address', '') or '').strip()

        return {
            'host': host,
            'port': port,
            'use_tls': _as_bool(get_config('auth.email.use_tls', True), True),
            'username': username,
            'password': get_config('auth.email.password', '') or '',
            'sender_address': sender_address or username,
            'sender_name': get_config('auth.email.sender_name', DEFAULT_SENDER_NAME) or DEFAULT_SENDER_NAME,
        }

    def _build_connection(self, smtp):
        return get_connection(
            SMTP_BACKEND,
            host=smtp['host'],
            port=smtp['port'],
            username=smtp['username'] or None,
            password=smtp['password'] or None,
            use_tls=smtp['use_tls'],
        )

    def _from_email(self, smtp) -> str:
        name = smtp.get('sender_name', DEFAULT_SENDER_NAME)
        address = smtp.get('sender_address', '') or 'noreply@localhost'
        return f'{name} <{address}>'

    def send_password_reset_email(self, user, reset_link: str) -> bool:
        """Send a reset link to ``user.email``. Never raises — returns success bool.

        Returns ``False`` (and logs) when email is not configured or the send
        fails, so the caller's request flow is never broken.
        """
        if not user.email:
            return False

        smtp = self._resolve_smtp_settings()
        if smtp is None:
            LOGGER.warning(
                'Password reset email NOT sent for user_id=%s: SMTP is not configured '
                '(auth.email.host is empty in system_config).',
                user.pk,
            )
            return False

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
            connection = self._build_connection(smtp)
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

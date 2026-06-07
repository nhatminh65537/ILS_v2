import hashlib
import hmac
import os
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import get_user_model
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner

from auth_app.constants import (
    PASSWORD_RESET_SIGNER_SALT,
    PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS,
)


User = get_user_model()


class PasswordResetService:
    """Stateless, single-use password-reset tokens (R-AUTH-02).

    Tokens are HMAC-signed with ``SECRET_KEY`` via ``itsdangerous`` and carry the
    user id plus a fingerprint of the user's *current* password hash, then a
    timestamp. No database row is stored:

    - Expiry is enforced by ``max_age`` at verification time.
    - One-time use: the fingerprint binds the token to the password it was issued
      for, so the moment the password changes (e.g. a successful reset, a normal
      change, or an admin reset) every previously-issued token stops verifying —
      same approach as Django's ``PasswordResetTokenGenerator``.
    - Rotating ``SECRET_KEY`` also invalidates all outstanding tokens.
    """

    def _signer(self) -> TimestampSigner:
        # Built per call so a runtime SECRET_KEY change is picked up immediately.
        return TimestampSigner(settings.SECRET_KEY, salt=PASSWORD_RESET_SIGNER_SALT)

    def _password_fingerprint(self, user) -> str:
        """Short, opaque digest of the user's current password hash.

        Changing the password changes ``user.password`` and therefore this
        fingerprint, which is what makes a token single-use. Hashing keeps the
        password hash itself out of the (emailed) token. Keyed with SECRET_KEY so
        the fingerprint can't be precomputed from a leaked password hash alone.
        """
        secret = settings.SECRET_KEY.encode('utf-8')
        message = (user.password or '').encode('utf-8')
        return hmac.new(secret, message, hashlib.sha256).hexdigest()[:16]

    def generate_token(self, user) -> str:
        payload = f'{user.pk}:{self._password_fingerprint(user)}'
        return self._signer().sign(payload).decode('utf-8')

    def verify_token(self, token: str):
        """Return the active ``User`` for a valid, unexpired, unused token, else ``None``."""
        try:
            raw = self._signer().unsign(token, max_age=PASSWORD_RESET_TOKEN_MAX_AGE_SECONDS)
        except (SignatureExpired, BadSignature):
            return None

        try:
            user_id_str, _, fingerprint = raw.decode('utf-8').partition(':')
            user_id = int(user_id_str)
        except (ValueError, AttributeError):
            return None

        if not fingerprint:
            return None

        user = User.objects.filter(pk=user_id, is_active=True).first()
        if user is None:
            return None

        # Single-use check: reject if the password has changed since issuance.
        # hmac.compare_digest avoids timing leaks on the fingerprint comparison.
        if not hmac.compare_digest(fingerprint, self._password_fingerprint(user)):
            return None

        return user

    def build_reset_link(self, token: str) -> str:
        base = getattr(settings, 'FRONTEND_URL', 'http://localhost:4000').rstrip('/')
        locale = os.environ.get('FRONTEND_DEFAULT_LOCALE', 'vi')
        return f'{base}/{locale}/reset-password?token={quote(token)}'

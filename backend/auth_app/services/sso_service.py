import re
import secrets
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import jwt
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction

from api.models import Role, UserAuthProvider, UserProfile, UserRole
from api.utils import get_config
from auth_app.services.token_service import TokenService


User = get_user_model()


class SSOConfigError(Exception):
    pass


class SSOAuthError(Exception):
    pass


class SSOLinkError(Exception):
    pass


class AuthentikSSOService:
    STATE_TTL_SECONDS = 300
    DEFAULT_SCOPE = 'openid profile email'

    def oidc_discovery(self) -> dict:
        config = self._get_oidc_config()
        discovery_url = f"{config['base_url']}/application/o/{config['client_id']}/.well-known/openid-configuration"
        return self._fetch_json(discovery_url)

    def get_redirect_url(self, callback_url: str) -> dict:
        config = self._get_oidc_config()
        discovery = self.oidc_discovery()
        authorization_endpoint = discovery.get('authorization_endpoint')
        if not authorization_endpoint:
            raise SSOConfigError('OIDC discovery is missing authorization endpoint.')

        state = secrets.token_urlsafe(24)
        nonce = secrets.token_urlsafe(24)
        cache.set(self._state_cache_key(state), {'nonce': nonce}, timeout=self.STATE_TTL_SECONDS)

        query = urlencode(
            {
                'client_id': config['client_id'],
                'response_type': 'code',
                'scope': self.DEFAULT_SCOPE,
                'redirect_uri': callback_url,
                'state': state,
                'nonce': nonce,
            }
        )
        return {'url': f'{authorization_endpoint}?{query}', 'state': state}

    def handle_callback(self, code: str, state: str, callback_url: str, device_info: str = '') -> dict:
        if not code:
            raise SSOAuthError('Missing authorization code.')
        if not state:
            raise SSOAuthError('Missing state parameter.')

        state_payload = cache.get(self._state_cache_key(state))
        cache.delete(self._state_cache_key(state))
        if not state_payload:
            raise SSOAuthError('Invalid or expired state.')

        discovery = self.oidc_discovery()
        token_endpoint = discovery.get('token_endpoint')
        if not token_endpoint:
            raise SSOConfigError('OIDC discovery is missing token endpoint.')

        tokens = self._exchange_code(code=code, callback_url=callback_url, token_endpoint=token_endpoint)
        id_token = tokens.get('id_token')
        if not id_token:
            raise SSOAuthError('OIDC provider did not return id_token.')

        claims = self._decode_id_token(id_token)
        if claims.get('nonce') != state_payload.get('nonce'):
            raise SSOAuthError('Invalid nonce.')

        user = self._resolve_user_from_claims(claims)
        issued_tokens = TokenService().issue_tokens(user)
        TokenService()._create_session(user=user, refresh_token=issued_tokens['refresh'], device_info=device_info)

        return {
            'access': issued_tokens['access'],
            'refresh': issued_tokens['refresh'],
            'user': user,
        }

    def link_identity(
        self,
        user,
        external_id: str,
        provider: str = UserAuthProvider.Provider.AUTHENTIK,
        email: str = '',
        name: str = '',
        extra_data: dict | None = None,
    ) -> tuple[UserAuthProvider, bool]:
        provider = (provider or UserAuthProvider.Provider.AUTHENTIK).lower()
        valid_providers = {choice[0] for choice in UserAuthProvider.Provider.choices}
        if provider not in valid_providers:
            raise SSOConfigError('Unsupported auth provider.')

        if not external_id:
            raise SSOLinkError('external_id is required to link identity.')

        existing_identity = UserAuthProvider.objects.filter(provider=provider, external_id=external_id).first()
        if existing_identity:
            if existing_identity.user_id == user.id:
                return existing_identity, False
            raise SSOLinkError('Identity is already linked to another user.')

        user_provider = UserAuthProvider.objects.filter(user=user, provider=provider, is_active=True).first()
        if user_provider and user_provider.external_id != external_id:
            raise SSOLinkError('User is already linked to this provider.')

        payload = extra_data.copy() if extra_data else {}
        if email:
            payload['email'] = email
        if name:
            payload['name'] = name

        created_identity = UserAuthProvider.objects.create(
            user=user,
            provider=provider,
            external_id=external_id,
            extra_data=payload or None,
            is_primary=not user.auth_providers.filter(is_active=True).exists(),
            is_active=True,
        )
        return created_identity, True

    def _resolve_user_from_claims(self, claims: dict):
        external_id = claims.get('sub')
        if not external_id:
            raise SSOAuthError('OIDC id_token is missing sub claim.')

        existing_identity = UserAuthProvider.objects.select_related('user').filter(
            provider=UserAuthProvider.Provider.AUTHENTIK,
            external_id=external_id,
            is_active=True,
        ).first()
        if existing_identity:
            return existing_identity.user

        email = (claims.get('email') or '').strip().lower()
        name = (claims.get('name') or '').strip()

        user = None
        if email and get_config('auth.link_accounts_enabled', True):
            user = User.objects.filter(email__iexact=email).first()

        if user is None:
            user = self._create_user(email=email, name=name, external_id=external_id)

        self.link_identity(
            user=user,
            external_id=external_id,
            provider=UserAuthProvider.Provider.AUTHENTIK,
            email=email,
            name=name,
            extra_data=claims,
        )
        return user

    def _create_user(self, email: str, name: str, external_id: str):
        base_username = self._build_base_username(email=email, name=name, external_id=external_id)
        username = self._ensure_unique_username(base_username)

        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=None,
            )
            UserProfile.objects.create(user=user)

            member_role, _ = Role.objects.get_or_create(
                name='Member',
                defaults={'description': 'Default role for registered users', 'is_system': True},
            )
            UserRole.objects.get_or_create(user=user, role=member_role)

        return user

    def _get_oidc_config(self) -> dict:
        if not get_config('auth.sso_enabled', False):
            raise SSOConfigError('SSO is disabled.')

        base_url = (get_config('auth.sso_base_url', '') or '').rstrip('/')
        client_id = (get_config('auth.sso_client_id', '') or '').strip()
        client_secret = (get_config('auth.sso_client_secret', '') or '').strip()

        if not base_url:
            raise SSOConfigError('Missing auth.sso_base_url configuration.')
        if not client_id:
            raise SSOConfigError('Missing auth.sso_client_id configuration.')
        if not client_secret:
            raise SSOConfigError('Missing auth.sso_client_secret configuration.')

        return {'base_url': base_url, 'client_id': client_id, 'client_secret': client_secret}

    def _exchange_code(self, code: str, callback_url: str, token_endpoint: str) -> dict:
        config = self._get_oidc_config()
        body = urlencode(
            {
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': callback_url,
                'client_id': config['client_id'],
                'client_secret': config['client_secret'],
            }
        ).encode('utf-8')

        request = Request(
            token_endpoint,
            data=body,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            method='POST',
        )
        return self._fetch_json(request)

    @staticmethod
    def _decode_id_token(id_token: str) -> dict:
        try:
            return jwt.decode(
                id_token,
                options={
                    'verify_signature': False,
                    'verify_aud': False,
                    'verify_exp': False,
                },
                algorithms=['HS256', 'RS256', 'ES256'],
            )
        except jwt.PyJWTError as exc:
            raise SSOAuthError('Failed to decode id_token.') from exc

    @staticmethod
    def _fetch_json(request_or_url) -> dict:
        try:
            with urlopen(request_or_url, timeout=10) as response:
                raw = response.read().decode('utf-8')
        except (HTTPError, URLError, TimeoutError) as exc:
            raise SSOAuthError('Failed to reach OIDC provider.') from exc

        try:
            return json.loads(raw)
        except ValueError as exc:
            raise SSOAuthError('OIDC provider returned invalid JSON.') from exc

    @staticmethod
    def _build_base_username(email: str, name: str, external_id: str) -> str:
        if email and '@' in email:
            candidate = email.split('@', 1)[0]
        elif name:
            candidate = name
        else:
            candidate = f'sso_{external_id[:8]}'

        normalized = re.sub(r'[^a-zA-Z0-9_\-.]', '_', candidate).strip('._-')
        normalized = normalized or f'sso_{external_id[:8]}'
        return normalized[:150]

    @staticmethod
    def _ensure_unique_username(base_username: str) -> str:
        username = base_username[:150]
        suffix = 1
        while User.objects.filter(username=username).exists():
            raw = f'{base_username}_{suffix}'
            username = raw[:150]
            suffix += 1
        return username

    @staticmethod
    def _state_cache_key(state: str) -> str:
        return f'sso:state:{state}'

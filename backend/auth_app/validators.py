from rest_framework import serializers

from api.utils import get_config


def validate_password_policy(value: str) -> str:
    """Validate a password against the configurable ``auth.password.*`` policy.

    Shared by the change-password and reset-password serializers so the policy
    has a single source of truth. Raises ``serializers.ValidationError`` on the
    first failing rule; returns the value unchanged on success.
    """
    min_length = int(get_config('auth.password.min_length', 8) or 8)
    if len(value) < min_length:
        raise serializers.ValidationError(f'Password must be at least {min_length} characters long.')

    if bool(get_config('auth.password.require_uppercase', False)) and not any(ch.isupper() for ch in value):
        raise serializers.ValidationError('Password must contain at least one uppercase letter.')

    if bool(get_config('auth.password.require_number', False)) and not any(ch.isdigit() for ch in value):
        raise serializers.ValidationError('Password must contain at least one number.')

    if bool(get_config('auth.password.require_special', False)) and not any(not ch.isalnum() for ch in value):
        raise serializers.ValidationError('Password must contain at least one special character.')

    return value

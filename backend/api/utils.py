from django.core.cache import cache

from api.models import SystemConfig


_CACHE_SENTINEL = object()


def get_config(key, default=None):
    """Read system configuration value with typed conversion.

    Runtime keys (`is_runtime=True`) are always read from DB.
    Non-runtime keys are cached for faster reads.
    """
    cache_key = f'system_config:{key}'
    cached_value = cache.get(cache_key, _CACHE_SENTINEL)
    if cached_value is not _CACHE_SENTINEL:
        return cached_value

    try:
        config = SystemConfig.objects.only('value', 'value_type', 'is_runtime').get(key=key)
    except SystemConfig.DoesNotExist:
        return default

    typed_value = config.get_typed_value()

    if not config.is_runtime:
        cache.set(cache_key, typed_value, timeout=300)

    return typed_value


def invalidate_config_cache(key):
    """Invalidate cached non-runtime config value by key."""
    cache.delete(f'system_config:{key}')

import logging

from django.db import connection, transaction
from django.urls import URLPattern, URLResolver, get_resolver

from api.models import Permission, Role, RolePermission
from auth_app.permissions import derive_permission_key, get_role_granted


LOGGER = logging.getLogger(__name__)
SKIP_PREFIXES = ('admin/', '__debug__/')
REQUIRED_TABLES = {'permission', 'role', 'role_permission'}


def discover_permissions() -> dict:
    """
    Discover permissions from decorated endpoints and sync RolePermission mappings.

    Naming format is lowercase: {app_label}.{resource_name}.{handler_method_name}
    """
    if not _has_required_tables():
        LOGGER.info('AUTHZ-DISCOVERY skip missing tables')
        return {
            'scanned_routes': 0,
            'discovered_permissions': 0,
            'created_permissions': 0,
            'reactivated_permissions': 0,
            'inactive_permissions': 0,
            'created_roles': 0,
            'linked_role_permissions': 0,
        }

    discovered, scanned_routes = _collect_discovered_permissions()

    stats = {
        'scanned_routes': scanned_routes,
        'discovered_permissions': len(discovered),
        'created_permissions': 0,
        'reactivated_permissions': 0,
        'inactive_permissions': 0,
        'created_roles': 0,
        'linked_role_permissions': 0,
    }

    with transaction.atomic():
        Permission.objects.update(is_active=False)

        role_cache = {}
        for permission_name, meta in discovered.items():
            permission, created = Permission.objects.get_or_create(
                name=permission_name,
                defaults={
                    'description': f"Auto-discovered from {meta['source']}",
                    'is_active': True,
                },
            )

            if created:
                stats['created_permissions'] += 1
            elif not permission.is_active:
                permission.is_active = True
                permission.save(update_fields=['is_active', 'updated_at'])
                stats['reactivated_permissions'] += 1

            for role_name in sorted(meta['roles']):
                role = role_cache.get(role_name)
                if role is None:
                    role, role_created = Role.objects.get_or_create(
                        name=role_name,
                        defaults={
                            'description': f'Built-in role discovered from decorated endpoints: {role_name}',
                            'is_system': True,
                        },
                    )
                    role_cache[role_name] = role
                    if role_created:
                        stats['created_roles'] += 1
                    elif not role.is_system:
                        LOGGER.warning(
                            'AUTHZ-DISCOVERY role_exists_not_system role=%s',
                            role_name,
                        )

                _, linked = RolePermission.objects.get_or_create(role=role, permission=permission)
                if linked:
                    stats['linked_role_permissions'] += 1

        stats['inactive_permissions'] = Permission.objects.filter(is_active=False).count()

    LOGGER.info(
        'AUTHZ-DISCOVERY done scanned_routes=%s discovered_permissions=%s created_permissions=%s '
        'reactivated_permissions=%s inactive_permissions=%s created_roles=%s linked_role_permissions=%s',
        stats['scanned_routes'],
        stats['discovered_permissions'],
        stats['created_permissions'],
        stats['reactivated_permissions'],
        stats['inactive_permissions'],
        stats['created_roles'],
        stats['linked_role_permissions'],
    )
    return stats


def _collect_discovered_permissions() -> tuple[dict, int]:
    discovered = {}
    scanned_routes = 0

    for pattern, route in _iter_urlpatterns(get_resolver().url_patterns):
        if _should_skip_route(route):
            continue

        callback = getattr(pattern, 'callback', None)
        if callback is None:
            continue

        view_class = getattr(callback, 'cls', None)
        if view_class is None:
            continue

        class_roles = get_role_granted(view_class)

        handlers = _extract_handler_method_names(callback, view_class)
        if not handlers:
            continue

        source = f'{view_class.__module__}.{view_class.__name__}'
        route_has_permission = False

        for handler_name in handlers:
            effective_roles = _resolve_roles_for_handler(view_class, handler_name, class_roles)
            if not effective_roles:
                continue

            permission_name = derive_permission_key(view_class, handler_name)
            if permission_name not in discovered:
                discovered[permission_name] = {
                    'roles': set(),
                    'source': source,
                }

            discovered[permission_name]['roles'].update(effective_roles)
            route_has_permission = True

        if route_has_permission:
            scanned_routes += 1

    return discovered, scanned_routes


def _resolve_roles_for_handler(
    view_class,
    handler_name: str,
    class_roles: tuple[str, ...],
) -> tuple[str, ...]:
    handler = getattr(view_class, handler_name, None)
    if handler is None:
        return class_roles

    handler_roles = get_role_granted(handler)
    if handler_roles:
        return handler_roles

    return class_roles


def _iter_urlpatterns(urlpatterns, prefix=''):
    for pattern in urlpatterns:
        route = f'{prefix}{pattern.pattern}'
        if isinstance(pattern, URLResolver):
            yield from _iter_urlpatterns(pattern.url_patterns, route)
        elif isinstance(pattern, URLPattern):
            yield pattern, route


def _should_skip_route(route: str) -> bool:
    return any(route.startswith(prefix) for prefix in SKIP_PREFIXES)


def _extract_handler_method_names(callback, view_class) -> list[str]:
    actions = getattr(callback, 'actions', None)
    if isinstance(actions, dict) and actions:
        return sorted({str(action).strip().lower() for action in actions.values() if action})

    handlers = []
    for method_name in getattr(view_class, 'http_method_names', []):
        if not method_name:
            continue
        lowered = method_name.lower()
        if lowered in {'options', 'head'}:
            continue
        if callable(getattr(view_class, lowered, None)):
            handlers.append(lowered)
    return sorted(set(handlers))


def _has_required_tables() -> bool:
    return REQUIRED_TABLES.issubset(set(connection.introspection.table_names()))

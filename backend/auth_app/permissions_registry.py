"""
Code-registered permission catalog.

Permissions declared here live alongside the URL-scanned permissions produced
by `permission_discovery.discover_permissions()`. They share the same
`Permission` table and bitmap encoding, but use the `system.*` namespace so
their names cannot collide with the auto-derived `api.*` keys.

To add a new permission: append a `CodePermission(...)` entry below and grant
it to the appropriate built-in role(s). On next app boot the discovery routine
will create the `Permission` row and link it to the listed roles.
"""

from dataclasses import dataclass
from typing import Iterable, Iterator, Tuple

from auth_app.constants import (
    BUILTIN_ROLE_ADMIN,
    BUILTIN_ROLE_EDITOR,
    PERM_ADMIN_PORTAL_ACCESS,
    PERM_ADMIN_SECTION_CHALLENGES,
    PERM_ADMIN_SECTION_CONFIG,
    PERM_ADMIN_SECTION_DASHBOARD,
    PERM_ADMIN_SECTION_LEARN,
    PERM_ADMIN_SECTION_NOTIFICATIONS,
    PERM_ADMIN_SECTION_QUIZZES,
    PERM_ADMIN_SECTION_RBAC,
    PERM_ADMIN_SECTION_STATISTICS,
    PERM_ADMIN_SECTION_USERS,
    PERM_MATERIAL_PURGE,
    PERM_MATERIAL_READ_ARCHIVE,
    PERM_MATERIAL_READ_DRAFT,
)


@dataclass(frozen=True)
class CodePermission:
    name: str
    description: str
    granted_roles: Tuple[str, ...]


CODE_PERMISSIONS: Tuple[CodePermission, ...] = (
    CodePermission(
        name=PERM_ADMIN_PORTAL_ACCESS,
        description='Access the admin portal surface.',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
    CodePermission(
        name=PERM_MATERIAL_READ_DRAFT,
        description='Read draft learning materials (courses, lessons, challenges, quizzes).',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
    CodePermission(
        name=PERM_MATERIAL_READ_ARCHIVE,
        description='Read archived learning materials.',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
    CodePermission(
        name=PERM_MATERIAL_PURGE,
        description='Hard-delete (purge) learning materials.',
        granted_roles=(BUILTIN_ROLE_ADMIN,),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_DASHBOARD,
        description='Access the admin dashboard section.',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_CONFIG,
        description='Access the system config admin section.',
        granted_roles=(BUILTIN_ROLE_ADMIN,),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_RBAC,
        description='Access the RBAC admin section.',
        granted_roles=(BUILTIN_ROLE_ADMIN,),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_USERS,
        description='Access the user management admin section.',
        granted_roles=(BUILTIN_ROLE_ADMIN,),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_STATISTICS,
        description='Access the statistics admin section.',
        granted_roles=(BUILTIN_ROLE_ADMIN,),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_NOTIFICATIONS,
        description='Access the admin notifications section.',
        granted_roles=(BUILTIN_ROLE_ADMIN,),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_LEARN,
        description='Access the learn admin section (courses + lessons).',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_CHALLENGES,
        description='Access the challenges admin section.',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
    CodePermission(
        name=PERM_ADMIN_SECTION_QUIZZES,
        description='Access the quizzes admin section.',
        granted_roles=(BUILTIN_ROLE_ADMIN, BUILTIN_ROLE_EDITOR),
    ),
)


def iter_code_permissions() -> Iterator[CodePermission]:
    return iter(CODE_PERMISSIONS)


def code_permission_names() -> Iterable[str]:
    return (perm.name for perm in CODE_PERMISSIONS)

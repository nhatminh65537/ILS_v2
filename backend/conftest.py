"""Shared pytest fixtures for ILS v2 backend tests.

The fixture implementations are grouped by domain in backend/tests/fixtures.
This conftest re-exports them to keep fixture names and test imports unchanged.
"""

import pytest

from tests.fixtures.auth import *  # noqa: F401,F403
from tests.fixtures.rbac import *  # noqa: F401,F403


@pytest.fixture(autouse=True)
def _clear_caches():
    """Reset the process-wide cache between tests.

    `get_config` caches non-runtime config values, and session/permission flags
    are cached too. The default LocMem cache persists across tests in the same
    process, so without this a config value (e.g. `auth.authorization_enabled`)
    set by one test would leak into the next and cause order-dependent failures.
    """
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def _seed_authz_discovery(db):
    """Ensure URL-scanned + code-registered permissions exist in the test DB.

    Tests rely on role grants linked via the discovery routine (admin/editor
    get system.material.read_draft, etc.). Without this, role-name fixtures
    create Role rows with zero permissions linked and authz checks fall through.

    Note: each test runs in its own transaction that is rolled back at the end,
    so this fixture re-runs per test. discover_permissions() is idempotent.
    """
    from auth_app.services.permission_discovery import discover_permissions
    discover_permissions()

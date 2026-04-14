"""Shared pytest fixtures for ILS v2 backend tests.

The fixture implementations are grouped by domain in backend/tests/fixtures.
This conftest re-exports them to keep fixture names and test imports unchanged.
"""

from tests.fixtures.auth import *  # noqa: F401,F403
from tests.fixtures.rbac import *  # noqa: F401,F403

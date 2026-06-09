"""Unit tests for FlagValidationService.generate_instance_flag.

Regression guard: the random tail must be inserted INSIDE the ``ILS{...}``
wrapper (before the trailing ``}``), not appended after the closing brace.
"""
import pytest

from api.services.flag_validation_service import FlagValidationService

pytestmark = pytest.mark.unit


def test_random_tail_inserted_inside_braces():
    base = 'ILS{b4by_b4by_r34d_}'
    out = FlagValidationService.generate_instance_flag(base, 8)

    # Keeps a valid wrapper: starts with the base body, ends with a single '}'.
    assert out.startswith('ILS{b4by_b4by_r34d_')
    assert out.endswith('}')
    assert out.count('}') == 1
    # Tail of exactly 8 chars sits between the base body and the closing brace.
    assert out == f'ILS{{b4by_b4by_r34d_{out[19:-1]}}}'
    assert len(out[19:-1]) == 8


def test_zero_tail_returns_base_unchanged():
    base = 'ILS{static}'
    assert FlagValidationService.generate_instance_flag(base, 0) == base


def test_negative_tail_returns_base_unchanged():
    base = 'ILS{static}'
    assert FlagValidationService.generate_instance_flag(base, -1) == base


def test_base_without_closing_brace_appends_tail():
    base = 'ILS{base_'
    out = FlagValidationService.generate_instance_flag(base, 5)
    assert out.startswith('ILS{base_')
    assert len(out) == len(base) + 5


def test_random_tail_is_unique_per_call():
    base = 'ILS{x}'
    a = FlagValidationService.generate_instance_flag(base, 12)
    b = FlagValidationService.generate_instance_flag(base, 12)
    assert a != b

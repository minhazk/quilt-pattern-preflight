from fractions import Fraction

import pytest
from hypothesis import given
from hypothesis import strategies as st

from preflight_service.measurements import parse_measurement, round_up_to_increment


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("2 1/2", Fraction(5, 2)),
        ("2½″", Fraction(5, 2)),
        ("one quarter inch", Fraction(1, 4)),
        ("1.25", Fraction(5, 4)),
        ("⅞ yard", Fraction(7, 8)),
    ],
)
def test_measurement_normalisation(raw: str, expected: Fraction) -> None:
    assert parse_measurement(raw) == expected


def test_negative_measurement_is_rejected() -> None:
    with pytest.raises(ValueError):
        parse_measurement("-1/4")


@given(
    value=st.fractions(min_value=Fraction(0), max_value=Fraction(100), max_denominator=64),
    increment=st.sampled_from([Fraction(1, 8), Fraction(1, 4), Fraction(1, 2)]),
)
def test_rounding_never_falls_below_raw(value: Fraction, increment: Fraction) -> None:
    rounded = round_up_to_increment(value, increment)
    assert rounded >= value
    assert rounded % increment == 0

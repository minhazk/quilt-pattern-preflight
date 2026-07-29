from __future__ import annotations

import math
import re
from fractions import Fraction

UNICODE_FRACTIONS = {
    "¼": "1/4",
    "½": "1/2",
    "¾": "3/4",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
    "⅓": "1/3",
    "⅔": "2/3",
}

TEXT_FRACTIONS = {
    "one quarter": "1/4",
    "one half": "1/2",
    "three quarters": "3/4",
    "one eighth": "1/8",
    "three eighths": "3/8",
    "five eighths": "5/8",
    "seven eighths": "7/8",
}


def normalize_fraction_text(value: str) -> str:
    normalized = value.strip().lower()
    normalized = normalized.replace("inches", "").replace("inch", "")
    normalized = normalized.replace("yards", "").replace("yard", "")
    normalized = normalized.replace('"', "").replace("″", "")
    for phrase, fraction in TEXT_FRACTIONS.items():
        normalized = normalized.replace(phrase, fraction)
    for glyph, fraction in UNICODE_FRACTIONS.items():
        if glyph in normalized:
            index = normalized.index(glyph)
            before = normalized[:index].rstrip()
            after = normalized[index + 1 :]
            separator = " " if before and before[-1].isdigit() else ""
            normalized = f"{before}{separator}{fraction}{after}"
    return re.sub(r"\s+", " ", normalized).strip()


def parse_measurement(value: str) -> Fraction:
    normalized = normalize_fraction_text(value)
    if not normalized:
        raise ValueError("Measurement is empty")
    if re.fullmatch(r"-?\d+\s+\d+/\d+", normalized):
        whole, fraction = normalized.split()
        result = Fraction(int(whole), 1) + Fraction(fraction)
    else:
        result = Fraction(normalized)
    if result < 0:
        raise ValueError("Measurement cannot be negative")
    return result


def format_fraction(value: Fraction) -> str:
    whole, remainder = divmod(value.numerator, value.denominator)
    if remainder == 0:
        return str(whole)
    fraction = f"{remainder}/{value.denominator}"
    return f"{whole} {fraction}" if whole else fraction


def ceil_fraction(value: Fraction) -> int:
    return -(-value.numerator // value.denominator)


def floor_fraction(value: Fraction) -> int:
    return math.floor(value)


def round_up_to_increment(value: Fraction, increment: Fraction) -> Fraction:
    if increment <= 0:
        raise ValueError("Rounding increment must be positive")
    return increment * ceil_fraction(value / increment)


def yards_from_inches(inches: Fraction) -> Fraction:
    return inches / 36

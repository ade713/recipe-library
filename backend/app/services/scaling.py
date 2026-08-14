"""Ingredient scaling utilities.

First learning task:
Implement `scale_ingredient_line` with Codex guidance.

Start simple. Only scale lines where the first token or first two tokens clearly form a quantity.
Leave unclear lines unchanged.
"""

from fractions import Fraction


def scale_ingredient_line(line: str, multiplier: float) -> str:
    """Return a scaled ingredient line when the leading quantity can be parsed.

    Examples:
    - "2 cups flour", 2 -> "4 cups flour"
    - "1/2 tsp salt", 2 -> "1 tsp salt"
    - "3 eggs", 3 -> "9 eggs"
    - "salt to taste", 2 -> "salt to taste"

    TODO: Implement this as the first Python learning task.
    """

    parts = line.split(maxsplit=2)
    if not parts or len(parts) <= 1:
        return line

    if '/' in parts[0]:
        number = Fraction(parts[0])
        quantity = number * Fraction(multiplier)
        quantity_str = format_quantity(quantity)

        return f"{quantity_str} {' '.join(parts[1:])}"
    elif '/' in parts[1] and parts[0].isdigit():
        number = Fraction(parts[0])
        fraction = Fraction(parts[1])
        number += fraction
        quantity = number * Fraction(multiplier)
        quantity_str = format_quantity(quantity)

        return f"{quantity_str} {' '.join(parts[2:])}"
    elif parts[0].isdigit():
        number = Fraction(parts[0])
        quantity = number * Fraction(multiplier)
        quantity_str = format_quantity(quantity)

        return f"{quantity_str} {' '.join(parts[1:])}"

    return line


def format_quantity(quantity: Fraction) -> str:
    """Format a quantity as a string, using mixed fractions when appropriate."""

    numerator = quantity.numerator
    denominator = quantity.denominator

    digit = numerator // denominator
    remainder = numerator % denominator
    remainder_fraction = Fraction(remainder, denominator)

    if digit > 0 and remainder > 0:
        return f"{digit} {remainder_fraction}"
    elif digit > 0:
        return str(digit)
    else:
        return str(remainder_fraction)

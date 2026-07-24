"""Ingredient parsing helpers.

Planned responsibilities:
- Parse leading quantities such as "2", "1/2", and "1 1/2".
- Split ingredient lines into quantity, unit, name, and preparation note when possible.
- Mark uncertain ingredients as partial or unparsed.

Keep this conservative. It is better to leave an ingredient unchanged than to scale it incorrectly.
"""


def parse_leading_quantity(line: str) -> float | None:
    """Return the leading quantity if it can be parsed.

    TODO: Implement after `scale_ingredient_line`.
    """
    raise NotImplementedError("Implement during the ingredient parsing phase.")

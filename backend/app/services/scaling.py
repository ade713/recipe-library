"""Ingredient scaling utilities.

First learning task:
Implement `scale_ingredient_line` with Codex guidance.

Start simple. Only scale lines where the first token or first two tokens clearly form a quantity.
Leave unclear lines unchanged.
"""


def scale_ingredient_line(line: str, multiplier: float) -> str:
    """Return a scaled ingredient line when the leading quantity can be parsed.

    Examples:
    - "2 cups flour", 2 -> "4 cups flour"
    - "1/2 tsp salt", 2 -> "1 tsp salt"
    - "3 eggs", 3 -> "9 eggs"
    - "salt to taste", 2 -> "salt to taste"

    TODO: Implement this as the first Python learning task.
    """
    return line

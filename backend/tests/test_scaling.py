import pytest

from app.services.scaling import scale_ingredient_line


@pytest.mark.parametrize(
    ("line", "multiplier", "expected"),
    [
        ("2 cups flour", 2, "4 cups flour"),
        ("3 eggs", 3, "9 eggs"),
        ("1/2 tsp salt", 2, "1 tsp salt"),
        ("1 1/2 tbsp olive oil", 2, "3 tbsp olive oil"),
        ("salt to taste", 2, "salt to taste"),
        ("", 2, ""),
        ("salt", 2, "salt"),
        ("1/2 cups rice", 3, "1 1/2 cups rice"),
        ("1 1/2 cups flour", 3, "4 1/2 cups flour"),
    ],
)
def test_scale_ingredient_line(line: str, multiplier: float, expected: str) -> None:
    assert scale_ingredient_line(line, multiplier) == expected

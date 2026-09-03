from app.services.recipe_normalizer import normalize_recipe_draft
from app.services.recipe_parser import ParsedRecipe


def test_normalize_recipe_draft_maps_parsed_recipe_to_editable_draft() -> None:
    parsed_recipe = ParsedRecipe(
        title="Tomato Soup",
        ingredients=("2 cans tomatoes", "1 cup vegetable stock"),
        instructions=("Combine ingredients.", "Simmer for 20 minutes."),
        source_url="https://recipes.example.com/tomato-soup",
        warnings=("Author was not provided by the source.",),
        description="A quick pantry soup.",
        image_url="https://recipes.example.com/soup.jpg",
        author=None,
        site_name="Example Kitchen",
        prep_time_minutes=10,
        cook_time_minutes=20,
        total_time_minutes=30,
        yields_text=None,
    )

    result = normalize_recipe_draft(parsed_recipe)

    assert result.warnings == parsed_recipe.warnings
    assert result.draft.title == "Tomato Soup"
    assert result.draft.description == "A quick pantry soup."
    assert str(result.draft.source_url) == parsed_recipe.source_url
    assert result.draft.source_domain == "recipes.example.com"
    assert result.draft.source_site_name == "Example Kitchen"
    assert result.draft.source_author is None
    assert str(result.draft.image_url) == "https://recipes.example.com/soup.jpg"
    assert result.draft.prep_time_minutes == 10
    assert result.draft.cook_time_minutes == 20
    assert result.draft.total_time_minutes == 30
    assert [ingredient.model_dump() for ingredient in result.draft.ingredients] == [
        {
            "position": 1,
            "original_text": "2 cans tomatoes",
            "quantity": None,
            "quantity_text": None,
            "unit": None,
            "name": None,
            "preparation_note": None,
            "is_optional": False,
            "scale_locked": False,
            "parse_status": "unparsed",
        },
        {
            "position": 2,
            "original_text": "1 cup vegetable stock",
            "quantity": None,
            "quantity_text": None,
            "unit": None,
            "name": None,
            "preparation_note": None,
            "is_optional": False,
            "scale_locked": False,
            "parse_status": "unparsed",
        },
    ]
    assert [step.model_dump() for step in result.draft.steps] == [
        {
            "position": 1,
            "instruction": "Combine ingredients.",
            "section_title": None,
        },
        {
            "position": 2,
            "instruction": "Simmer for 20 minutes.",
            "section_title": None,
        },
    ]
    assert result.draft.base_servings is None
    assert result.draft.servings_unit is None
    assert result.draft.tags == []
    assert result.draft.tips == []


def test_normalize_recipe_draft_allows_missing_image_url() -> None:
    parsed_recipe = ParsedRecipe(
        title="Family Soup",
        ingredients=(),
        instructions=(),
        source_url="https://example.com/family-soup",
        warnings=(),
        description=None,
        image_url=None,
        author=None,
        site_name=None,
        prep_time_minutes=None,
        cook_time_minutes=None,
        total_time_minutes=None,
        yields_text=None,
    )

    result = normalize_recipe_draft(parsed_recipe)

    assert result.draft.image_url is None

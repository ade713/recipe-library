from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.recipe import (
    IngredientDraft,
    RecipeDraft,
    RecipeRead,
    RecipeStepDraft,
    RecipeSummary,
    RecipeTipDraft,
)


def test_ingredient_draft_accepts_a_parsed_ingredient() -> None:
    ingredient = IngredientDraft(
        position=1,
        original_text="1 1/2 cups flour",
        quantity=Decimal("1.5"),
        quantity_text="1 1/2",
        unit="cups",
        name="flour",
        parse_status="parsed",
    )

    assert ingredient.position == 1
    assert ingredient.original_text == "1 1/2 cups flour"
    assert ingredient.quantity == Decimal("1.5")
    assert ingredient.is_optional is False
    assert ingredient.scale_locked is False


@pytest.mark.parametrize(
    ("position", "original_text"),
    [
        (0, "1 cup flour"),
        (1, ""),
    ],
)
def test_ingredient_draft_rejects_invalid_required_fields(
    position: int, original_text: str
) -> None:
    with pytest.raises(ValidationError):
        IngredientDraft(position=position, original_text=original_text)


def test_recipe_step_draft_accepts_an_instruction() -> None:
    step = RecipeStepDraft(
        position=1,
        instruction="Whisk the flour and water together.",
    )

    assert step.position == 1
    assert step.instruction == "Whisk the flour and water together."
    assert step.section_title is None


@pytest.mark.parametrize(
    ("position", "instruction"),
    [
        (0, "Preheat the oven."),
        (1, ""),
    ],
)
def test_recipe_step_draft_rejects_invalid_required_fields(
    position: int, instruction: str
) -> None:
    with pytest.raises(ValidationError):
        RecipeStepDraft(position=position, instruction=instruction)


def test_recipe_draft_builds_nested_models_from_input_data() -> None:
    draft = RecipeDraft(
        title="Tomato Soup",
        ingredients=[
            {
                "position": 1,
                "original_text": "2 cups tomatoes",
            }
        ],
        steps=[
            {
                "position": 1,
                "instruction": "Simmer the tomatoes.",
            }
        ],
    )

    assert draft.title == "Tomato Soup"
    assert isinstance(draft.ingredients[0], IngredientDraft)
    assert isinstance(draft.steps[0], RecipeStepDraft)
    assert draft.tips == []
    assert draft.tags == []


def test_recipe_draft_preserves_source_attribution() -> None:
    draft = RecipeDraft(
        title="Tomato Soup",
        source_url="https://example.com/tomato-soup",
        source_domain="example.com",
        source_site_name="Example Kitchen",
        source_author="Jamie Example",
    )

    assert str(draft.source_url) == "https://example.com/tomato-soup"
    assert draft.source_domain == "example.com"
    assert draft.source_site_name == "Example Kitchen"
    assert draft.source_author == "Jamie Example"


def test_recipe_tip_draft_accepts_a_source_tip() -> None:
    tip = RecipeTipDraft(
        position=1,
        tip="Add a squeeze of lemon before serving.",
    )

    assert tip.position == 1
    assert tip.tip == "Add a squeeze of lemon before serving."


@pytest.mark.parametrize(
    ("position", "tip"),
    [
        (0, "Let the soup rest for five minutes."),
        (1, ""),
    ],
)
def test_recipe_tip_draft_rejects_invalid_required_fields(
    position: int, tip: str
) -> None:
    with pytest.raises(ValidationError):
        RecipeTipDraft(position=position, tip=tip)


def test_recipe_read_builds_from_orm_attributes() -> None:
    recipe_id = uuid4()
    recipe_record = SimpleNamespace(
        id=recipe_id,
        title="Tomato Soup",
        ingredients=[
            SimpleNamespace(position=1, original_text="2 cups tomatoes")
        ],
        steps=[
            SimpleNamespace(position=1, instruction="Simmer the tomatoes.")
        ],
        tips=[SimpleNamespace(position=1, tip="Finish with fresh basil.")],
        tags=[SimpleNamespace(name="Dinner")],
    )

    recipe = RecipeRead.model_validate(recipe_record)

    assert recipe.id == recipe_id
    assert recipe.title == "Tomato Soup"
    assert isinstance(recipe.ingredients[0], IngredientDraft)
    assert isinstance(recipe.steps[0], RecipeStepDraft)
    assert isinstance(recipe.tips[0], RecipeTipDraft)
    assert recipe.tags == ["Dinner"]


def test_recipe_summary_builds_from_orm_attributes() -> None:
    recipe_id = uuid4()
    recipe_record = SimpleNamespace(
        id=recipe_id,
        title="Tomato Soup",
        image_url=None,
        total_time_minutes=30,
        base_servings=Decimal("4"),
        is_favorite=True,
        tags=[SimpleNamespace(name="Dinner")],
    )

    summary = RecipeSummary.model_validate(recipe_record)

    assert summary.id == recipe_id
    assert summary.title == "Tomato Soup"
    assert summary.total_time_minutes == 30
    assert summary.tags == ["Dinner"]

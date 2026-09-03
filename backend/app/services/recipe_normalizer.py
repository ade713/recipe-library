from dataclasses import dataclass

from pydantic import HttpUrl, TypeAdapter

from app.schemas.recipe import (
    IngredientDraft,
    RecipeDraft,
    RecipeStepDraft,
)
from app.services.recipe_parser import ParsedRecipe
from app.services.url_validator import extract_domain


@dataclass(frozen=True)
class NormalizedRecipeDraft:
    draft: RecipeDraft
    warnings: tuple[str, ...]


def normalize_recipe_draft(
    parsed_recipe: ParsedRecipe,
) -> NormalizedRecipeDraft:
    image_url = (
        TypeAdapter(HttpUrl).validate_strings(parsed_recipe.image_url)
        if parsed_recipe.image_url is not None
        else None
    )
    source_url = TypeAdapter(HttpUrl).validate_strings(
        parsed_recipe.source_url
    )
    ingredients = [
        IngredientDraft(
            position=position,
            original_text=ingredient_text,
        )
        for position, ingredient_text in enumerate(
            parsed_recipe.ingredients,
            start=1,
        )
    ]

    steps = [
        RecipeStepDraft(
            position=position,
            instruction=instruction_text,
        )
        for position, instruction_text in enumerate(
            parsed_recipe.instructions,
            start=1,
        )
    ]

    recipe_draft = RecipeDraft(
        title=parsed_recipe.title,
        description=parsed_recipe.description,
        source_url=source_url,
        source_domain=extract_domain(parsed_recipe.source_url),
        source_site_name=parsed_recipe.site_name,
        source_author=parsed_recipe.author,
        image_url=image_url,
        prep_time_minutes=parsed_recipe.prep_time_minutes,
        cook_time_minutes=parsed_recipe.cook_time_minutes,
        total_time_minutes=parsed_recipe.total_time_minutes,
        ingredients=ingredients,
        steps=steps,
    )

    return NormalizedRecipeDraft(
        draft=recipe_draft,
        warnings=parsed_recipe.warnings,
    )

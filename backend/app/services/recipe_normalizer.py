import re
from dataclasses import dataclass
from decimal import Decimal

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

    warnings = list(parsed_recipe.warnings)
    parsed_yields = parse_yields_text(parsed_recipe.yields_text)

    base_servings = None
    servings_unit = None

    if parsed_yields is not None:
        base_servings, servings_unit = parsed_yields
    elif parsed_recipe.yields_text is not None:
        warnings.append(
            f"Yield information could not be parsed: {parsed_recipe.yields_text}"
        )

    collected_warnings = tuple(warnings)
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
        base_servings=base_servings,
        servings_unit=servings_unit,
        ingredients=ingredients,
        steps=steps,
    )

    return NormalizedRecipeDraft(
        draft=recipe_draft,
        warnings=collected_warnings,
    )


def parse_yields_text(
    yields_text: str | None,
) -> tuple[Decimal, str] | None:
    if yields_text is None:
        return None

    servings_quantity_and_unit = re.fullmatch(
        r"^\s*(\d+(?:\.\d+)?)\s+([A-Za-z][A-Za-z -]*)\s*$",
        yields_text,
        flags=re.IGNORECASE,
    )
    if servings_quantity_and_unit is not None:
        quantity = Decimal(servings_quantity_and_unit.group(1))
        unit = servings_quantity_and_unit.group(2).strip().casefold()
        return (quantity, unit)

    serves_quantity = re.fullmatch(
        r"^\s*serves\s+(\d+(?:\.\d+)?)\s*$",
        yields_text,
        flags=re.IGNORECASE,
    )
    if serves_quantity is not None:
        quantity = Decimal(serves_quantity.group(1))
        return (quantity, "servings")

    return None

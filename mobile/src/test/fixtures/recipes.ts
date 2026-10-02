import type { RecipeDetailResponse, RecipeSummary } from "@/types/recipe";

const RECIPE_ID = "test_recipe_id";
const RECIPE_TITLE = "Chicken Wings";

export function makeRecipeSummary(overrides: Partial<RecipeSummary> = {}): RecipeSummary {
  const baseRecipeSummary = {
    id: RECIPE_ID,
    title: RECIPE_TITLE,
    image_url: null,
    total_time_minutes: null,
    base_servings: null,
    is_favorite: false,
    tags: [],
  };

  return {
    ...baseRecipeSummary,
    ...overrides,
  };
}

export function makeRecipeDetailResponse(overrides: Partial<RecipeDetailResponse> = {}): RecipeDetailResponse {
  const baseRecipeDetailResponse = {
    ...makeRecipeSummary(),
    description: null,
    source_url: null,
    source_domain: null,
    source_site_name: null,
    source_author: null,
    prep_time_minutes: null,
    cook_time_minutes: null,
    servings_unit: null,
    ingredients: [],
    steps: [],
    tips: [],
  };

  return {
    ...baseRecipeDetailResponse,
    ...overrides,
  };
}

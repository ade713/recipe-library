import type { RecipeCreateRequest } from "@/types/recipe";
import type { RecipeEditFormValues } from "@/recipes/recipe-edit-form";
import type { RecipeImportDraft } from "@/types/import";

/** Build a create payload from reviewed values and retained import metadata. */
export function formatImportDraft(draft: RecipeImportDraft, values: RecipeEditFormValues): RecipeCreateRequest {
  return {
    title: values.title,
    description: values.description ?? undefined,
    source_url: draft.source_url ?? undefined,
    source_domain: draft.source_domain ?? undefined,
    source_site_name: draft.source_site_name ?? undefined,
    source_author: draft.source_author ?? undefined,
    image_url: values.image_url ?? undefined,
    base_servings: values.base_servings ?? undefined,
    servings_unit: values.servings_unit ?? undefined,
    prep_time_minutes: values.prep_time_minutes ?? undefined,
    cook_time_minutes: values.cook_time_minutes ?? undefined,
    total_time_minutes: values.total_time_minutes ?? undefined,
    is_favorite: values.is_favorite,
    ingredients: values.ingredients,
    steps: values.steps,
    tips: values.tips,
    tags: draft.tags,
  };
}

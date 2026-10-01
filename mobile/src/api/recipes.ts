import type { RecipeDetailResponse, RecipeListResponse } from "@/types/recipe";

import { apiFetch } from "./client";

const RECIPES_PATH = "/recipes";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPE_DETAIL_ERROR_MESSAGE = "Expected a recipe detail response";

/** Fetch the authenticated user's recipe summaries. */
export async function listRecipes(token: string): Promise<RecipeListResponse> {
  const result = await apiFetch<RecipeListResponse>(RECIPES_PATH, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result === undefined) {
    throw new Error(RECIPE_LIST_ERROR_MESSAGE);
  }

  return result;
}

/** Fetch the authenticated user's recipe detail. */
export async function getRecipe(token: string, recipeId: string): Promise<RecipeDetailResponse> {
  const result = await apiFetch<RecipeDetailResponse>(`${RECIPES_PATH}/${recipeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result === undefined) {
    throw new Error(RECIPE_DETAIL_ERROR_MESSAGE);
  }

  return result;
}

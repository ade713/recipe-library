import type { RecipeDetailResponse, RecipeListResponse } from "@/types/recipe";

import { apiFetch } from "./client";

const RECIPES_PATH = "/recipes";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPE_DETAIL_ERROR_MESSAGE = "Expected a recipe detail response";

export type ListRecipesOptions = {
  query?: string;
};

/** Fetch the authenticated user's recipe summaries. */
export async function listRecipes(token: string, options: ListRecipesOptions = {}): Promise<RecipeListResponse> {
  const { query } = options;
  const params = new URLSearchParams();
  if (query !== undefined && query.length > 0) {
    params.set("q", query);
  }

  const queryString = params.toString();
  const fetchUrl = queryString.length > 0 ? `${RECIPES_PATH}?${queryString}` : RECIPES_PATH;

  const result = await apiFetch<RecipeListResponse>(fetchUrl, {
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

/** Set the favorite status of a recipe. */
export async function setRecipeFavorite(
  token: string,
  recipeId: string,
  isFavorite: boolean,
): Promise<RecipeDetailResponse> {
  const result = await apiFetch<RecipeDetailResponse>(`${RECIPES_PATH}/${recipeId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_favorite: isFavorite }),
  });

  if (result === undefined) {
    throw new Error(RECIPE_DETAIL_ERROR_MESSAGE);
  }

  return result;
}

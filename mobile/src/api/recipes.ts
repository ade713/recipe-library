import type {
  RecipeCreateRequest,
  RecipeDetailResponse,
  RecipeListResponse,
  RecipeUpdateRequest,
} from "@/types/recipe";

import { apiFetch } from "./client";

const RECIPE_DETAIL_ERROR_MESSAGE = "Expected a recipe detail response";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPES_PATH = "/recipes";

export type ListRecipesOptions = {
  favorite?: boolean;
  maxTotalTime?: number;
  query?: string;
  sort?: "recent" | "title" | "time";
};

/** Fetch the authenticated user's recipe summaries. */
export async function listRecipes(token: string, options: ListRecipesOptions = {}): Promise<RecipeListResponse> {
  const { query, favorite, sort, maxTotalTime } = options;
  const params = new URLSearchParams();
  if (query !== undefined && query.length > 0) {
    params.set("q", query);
  }
  if (favorite !== undefined) {
    params.set("favorite", String(favorite));
  }
  if (sort !== undefined) {
    params.set("sort", sort);
  }
  if (maxTotalTime !== undefined) {
    params.set("max_total_time", String(maxTotalTime));
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

/** Create a recipe for the authenticated user */
export async function createRecipe(token: string, payload: RecipeCreateRequest): Promise<RecipeDetailResponse> {
  const result = await apiFetch<RecipeDetailResponse>(RECIPES_PATH, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (result === undefined) {
    throw new Error(RECIPE_DETAIL_ERROR_MESSAGE);
  }

  return result;
}

/** Update the supplied fields of an authenticated user's recipe. */
export async function updateRecipe(
  token: string,
  recipeId: string,
  payload: RecipeUpdateRequest,
): Promise<RecipeDetailResponse> {
  const result = await apiFetch<RecipeDetailResponse>(`${RECIPES_PATH}/${recipeId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (result === undefined) {
    throw new Error(RECIPE_DETAIL_ERROR_MESSAGE);
  }

  return result;
}

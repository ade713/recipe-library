import type { RecipeListResponse } from "@/types/recipe";

import { apiFetch } from "./client";

const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";

/** Fetch the authenticated user's recipe summaries. */
export async function listRecipes(token: string): Promise<RecipeListResponse> {
  const result = await apiFetch<RecipeListResponse>("/recipes", {
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

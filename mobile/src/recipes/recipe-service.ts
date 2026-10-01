import { getRecipe, listRecipes } from "@/api/recipes";
import { getAccessToken } from "@/auth/token-storage";

import type { RecipeDetailResponse, RecipeListResponse } from "@/types/recipe";

const TOKEN_ERROR_MESSAGE = "No access token available";

/** Load recipe summaries using the stored access token. */
export async function loadRecipes(): Promise<RecipeListResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return listRecipes(accessToken);
}

/** Load a single recipe using the stored access token. */
export async function loadRecipe(recipeId: string): Promise<RecipeDetailResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return getRecipe(accessToken, recipeId);
}

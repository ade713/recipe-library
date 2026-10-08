import { getRecipe, listRecipes, setRecipeFavorite } from "@/api/recipes";
import type { ListRecipesOptions } from "@/api/recipes";
import { getAccessToken } from "@/auth/token-storage";

import type { RecipeDetailResponse, RecipeListResponse } from "@/types/recipe";

const TOKEN_ERROR_MESSAGE = "No access token available";

/** Load recipe summaries using the stored access token. */
export async function loadRecipes(options: ListRecipesOptions = {}): Promise<RecipeListResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return listRecipes(accessToken, options);
}

/** Load a single recipe using the stored access token. */
export async function loadRecipe(recipeId: string): Promise<RecipeDetailResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return getRecipe(accessToken, recipeId);
}

/** Update the favorite status of a recipe using the stored access token. */
export async function updateRecipeFavorite(recipeId: string, isFavorite: boolean): Promise<RecipeDetailResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return setRecipeFavorite(accessToken, recipeId, isFavorite);
}

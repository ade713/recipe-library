import { getAccessToken } from "@/auth/token-storage";
import { previewRecipeImport, saveRecipeImport } from "@/api/imports";
import type { RecipeCreateRequest, RecipeDetailResponse } from "@/types/recipe";
import type { RecipeImportPreviewRequest, RecipeImportPreviewResponse } from "@/types/import";

const NO_TOKEN_ERROR_MESSAGE = "No access token available";

/** Save a reviewed import using the stored access token. */
export async function saveImportDraft(importId: string, payload: RecipeCreateRequest): Promise<RecipeDetailResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(NO_TOKEN_ERROR_MESSAGE);
  }

  return saveRecipeImport(accessToken, importId, payload);
}

/** Load import preview for a recipe using the stored access token. */
export async function loadImportPreview(payload: RecipeImportPreviewRequest): Promise<RecipeImportPreviewResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(NO_TOKEN_ERROR_MESSAGE);
  }

  return previewRecipeImport(accessToken, payload);
}

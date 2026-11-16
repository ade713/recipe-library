import { getAccessToken } from "@/auth/token-storage";
import { previewRecipeImport } from "@/api/imports";

import type { RecipeImportPreviewRequest, RecipeImportPreviewResponse } from "@/types/import";

const NO_TOKEN_ERROR_MESSAGE = "No access token available";

/** Load import preview for a recipe using the stored access token. */
export async function loadImportPreview(payload: RecipeImportPreviewRequest): Promise<RecipeImportPreviewResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(NO_TOKEN_ERROR_MESSAGE);
  }

  return previewRecipeImport(accessToken, payload);
}

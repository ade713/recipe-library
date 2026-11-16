import type { RecipeImportPreviewRequest, RecipeImportPreviewResponse } from "@/types/import";

import { apiFetch } from "./client";

const IMPORT_PREVIEW_PATH = "/imports/preview";
const IMPORT_PREVIEW_RESPONSE_ERROR_MESSAGE = "Expected an import preview response";

/** Create an import preview of the recipe from URL. */
export async function previewRecipeImport(
  token: string,
  payload: RecipeImportPreviewRequest,
): Promise<RecipeImportPreviewResponse> {
  const response = await apiFetch<RecipeImportPreviewResponse>(IMPORT_PREVIEW_PATH, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response === undefined) {
    throw new Error(IMPORT_PREVIEW_RESPONSE_ERROR_MESSAGE);
  }

  return response;
}

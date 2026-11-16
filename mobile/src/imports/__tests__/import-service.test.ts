import { ApiError } from "@/api/errors";
import * as importsApi from "@/api/imports";
import * as tokenStorage from "@/auth/token-storage";
import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeImportPreviewRequest, RecipeImportPreviewResponse } from "@/types/import";

import { loadImportPreview } from "../import-service";

const ACCESS_TOKEN = "test-access-token";
const URL = "https://example.com/soup";

const RESPONSE: RecipeImportPreviewResponse = {
  import_id: "import-one",
  status: "duplicate",
  parser_used: null,
  draft: null,
  warnings: ["This recipe is already in your library."],
  existing_recipe_id: "recipe-one",
  next_actions: ["open_existing", "import_as_copy"],
};

describe("loadImportPreview", () => {
  it.each([undefined, false, true])("forwards the stored token and copy choice: %p", async (copyChoice) => {
    const payload: RecipeImportPreviewRequest = { url: URL, import_as_copy: copyChoice };

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(importsApi, "previewRecipeImport").mockResolvedValue(RESPONSE);

    expect(await loadImportPreview(payload)).toBe(RESPONSE);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, payload);
  });

  it("returns a partial draft with warnings unchanged", async () => {
    const { id, ...draft } = makeRecipeDetailResponse();
    const response: RecipeImportPreviewResponse = {
      ...RESPONSE,
      status: "partial",
      draft,
      parser_used: "recipe-scrapers",
      warnings: ["No ingredients found."],
      existing_recipe_id: null,
      next_actions: [],
    };

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(importsApi, "previewRecipeImport").mockResolvedValue(response);

    expect(await loadImportPreview({ url: URL })).toBe(response);
  });

  it("rejects a missing token without requesting a preview", async () => {
    const noTokenErrorMessage = "No access token available";

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(importsApi, "previewRecipeImport");

    await expect(loadImportPreview({ url: URL })).rejects.toThrow(noTokenErrorMessage);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without requesting a preview", async () => {
    const error = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(importsApi, "previewRecipeImport");

    await expect(loadImportPreview({ url: URL })).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([new ApiError(401), new ApiError(500), new Error("Network unavailable")])(
    "propagates API failures unchanged: %p",
    async (error) => {
      jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
      jest.spyOn(importsApi, "previewRecipeImport").mockRejectedValue(error);

      await expect(loadImportPreview({ url: URL })).rejects.toBe(error);
    },
  );
});

import { ApiError } from "@/api/errors";
import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as importsApi from "@/api/imports";
import * as tokenStorage from "@/auth/token-storage";
import type { RecipeCreateRequest } from "@/types/recipe";
import type { RecipeImportPreviewRequest, RecipeImportPreviewResponse } from "@/types/import";

import { loadImportPreview, saveImportDraft } from "../import-service";

const ACCESS_TOKEN = "test-access-token";
const IMPORT_ID = "import-one";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const NO_TOKEN_ERROR_MESSAGE = "No access token available";
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

describe("saveImportDraft", () => {
  const payload: RecipeCreateRequest = { title: "Reviewed soup", is_favorite: false, tags: [] };

  it("forwards the stored token, import ID, and reviewed payload and returns the saved recipe", async () => {
    const response = makeRecipeDetailResponse({ title: payload.title });

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(importsApi, "saveRecipeImport").mockResolvedValue(response);

    expect(await saveImportDraft(IMPORT_ID, payload)).toBe(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, IMPORT_ID, payload);
  });

  it("rejects a missing token without saving", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(importsApi, "saveRecipeImport");

    await expect(saveImportDraft(IMPORT_ID, payload)).rejects.toThrow(NO_TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without saving", async () => {
    const error = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(importsApi, "saveRecipeImport");

    await expect(saveImportDraft(IMPORT_ID, payload)).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([new ApiError(401), new ApiError(404), new ApiError(409), new Error(NETWORK_ERROR_MESSAGE)])(
    "propagates save failures unchanged: %p",
    async (error) => {
      jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
      jest.spyOn(importsApi, "saveRecipeImport").mockRejectedValue(error);

      await expect(saveImportDraft(IMPORT_ID, payload)).rejects.toBe(error);
    },
  );
});

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
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(importsApi, "previewRecipeImport");

    await expect(loadImportPreview({ url: URL })).rejects.toThrow(NO_TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without requesting a preview", async () => {
    const error = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(importsApi, "previewRecipeImport");

    await expect(loadImportPreview({ url: URL })).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([new ApiError(401), new ApiError(500), new Error(NETWORK_ERROR_MESSAGE)])(
    "propagates API failures unchanged: %p",
    async (error) => {
      jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
      jest.spyOn(importsApi, "previewRecipeImport").mockRejectedValue(error);

      await expect(loadImportPreview({ url: URL })).rejects.toBe(error);
    },
  );
});

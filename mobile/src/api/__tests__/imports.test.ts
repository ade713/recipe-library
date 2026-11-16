import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeImportPreviewResponse } from "@/types/import";

import * as client from "../client";
import { ApiError } from "../errors";
import { previewRecipeImport } from "../imports";

const PATH = "/imports/preview";
const TOKEN = "test-access-token";
const URL = "https://example.com/recipe?lang=en#ingredients";

const makePreview = (overrides: Partial<RecipeImportPreviewResponse> = {}): RecipeImportPreviewResponse => ({
  import_id: "import-one",
  status: "failed",
  parser_used: null,
  draft: null,
  warnings: ["Recipe data could not be parsed."],
  existing_recipe_id: null,
  next_actions: ["enter_manually", "open_source_url"],
  ...overrides,
});

describe("previewRecipeImport", () => {
  it.each([
    { payload: { url: URL }, body: JSON.stringify({ url: URL }) },
    { payload: { url: URL, import_as_copy: false }, body: JSON.stringify({ url: URL, import_as_copy: false }) },
    { payload: { url: URL, import_as_copy: true }, body: JSON.stringify({ url: URL, import_as_copy: true }) },
  ])("posts the requested copy choice with authentication: $body", async ({ payload, body }) => {
    const response = makePreview();

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await previewRecipeImport(TOKEN, payload)).toBe(response);
    expect(requestMock).toHaveBeenCalledWith(PATH, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body,
    });
  });

  it.each(["success", "partial"] as const)("returns a %s draft and its warnings unchanged", async (status) => {
    const { id, ...draft } = makeRecipeDetailResponse({ base_servings: "1.50" });
    const response = makePreview({
      status,
      draft,
      parser_used: "recipe-scrapers",
      warnings: ["Image URL was missing."],
      next_actions: [],
    });

    jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await previewRecipeImport(TOKEN, { url: URL })).toBe(response);
  });

  it.each(["blocked", "failed", "duplicate"] as const)("returns %s as a preview outcome", async (status) => {
    const response = makePreview({
      status,
      existing_recipe_id: status === "duplicate" ? "recipe-one" : null,
      next_actions:
        status === "duplicate" ? ["open_existing", "import_as_copy"] : ["enter_manually", "open_source_url"],
    });

    jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await previewRecipeImport(TOKEN, { url: URL })).toBe(response);
  });

  it("rejects a missing response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(previewRecipeImport(TOKEN, { url: URL })).rejects.toThrow("Expected an import preview response");
  });

  it.each([new ApiError(401), new ApiError(422), new ApiError(500), new Error("Network unavailable")])(
    "propagates request failures unchanged: %p",
    async (error) => {
      jest.spyOn(client, "apiFetch").mockRejectedValue(error);

      await expect(previewRecipeImport(TOKEN, { url: URL })).rejects.toBe(error);
    },
  );
});

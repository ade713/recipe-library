import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeCreateRequest } from "@/types/recipe";
import type { RecipeImportPreviewResponse } from "@/types/import";

import { ApiError } from "../errors";
import { previewRecipeImport, saveRecipeImport } from "../imports";
import * as client from "../client";

const IMPORT_ID = "import-one";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const PATH = "/imports/preview";
const REVIEWED_TITLE = "Reviewed soup";
const TITLE = "Soup";
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

describe("saveRecipeImport", () => {
  it("posts the reviewed draft to its import and returns the saved recipe unchanged", async () => {
    const payload: RecipeCreateRequest = {
      title: REVIEWED_TITLE,
      description: "Adjusted after preview",
      base_servings: 1.5,
      prep_time_minutes: 0,
      is_favorite: false,
      ingredients: [{ position: 1, original_text: "2 carrots" }],
      steps: [{ position: 1, instruction: "Simmer gently" }],
      tips: [],
      tags: ["Dinner"],
    };
    const response = makeRecipeDetailResponse({ title: payload.title, source_url: URL });

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await saveRecipeImport(TOKEN, IMPORT_ID, payload)).toBe(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(`/imports/${IMPORT_ID}/save`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(payload),
    });
  });

  it("preserves source attribution, ingredient metadata, and step sections in the save body", async () => {
    const payload: RecipeCreateRequest = {
      title: REVIEWED_TITLE,
      source_url: URL,
      source_domain: "example.com",
      source_site_name: "Example Kitchen",
      source_author: "Recipe author",
      ingredients: [
        {
          position: 1,
          original_text: "2 cups chopped carrots",
          quantity: "2.00",
          quantity_text: "2",
          unit: "cups",
          name: "carrots",
          preparation_note: "chopped",
          is_optional: false,
          scale_locked: true,
          parse_status: "parsed",
        },
      ],
      steps: [{ position: 1, instruction: "Simmer gently", section_title: "Soup" }],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(makeRecipeDetailResponse());

    await saveRecipeImport(TOKEN, IMPORT_ID, payload);

    expect(requestMock).toHaveBeenCalledWith(
      `/imports/${IMPORT_ID}/save`,
      expect.objectContaining({ body: JSON.stringify(payload) }),
    );
  });

  it("sends a minimal draft without adding defaults", async () => {
    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(makeRecipeDetailResponse());

    await saveRecipeImport(TOKEN, IMPORT_ID, { title: REVIEWED_TITLE, description: undefined });

    expect(requestMock).toHaveBeenCalledWith(
      `/imports/${IMPORT_ID}/save`,
      expect.objectContaining({
        body: JSON.stringify({ title: REVIEWED_TITLE }),
      }),
    );
  });

  it("rejects a missing saved recipe response", async () => {
    const savedImportRecipeErrorMessage = "Expected a saved import recipe response";

    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(saveRecipeImport(TOKEN, IMPORT_ID, { title: TITLE })).rejects.toThrow(savedImportRecipeErrorMessage);
  });

  it.each([
    new ApiError(401),
    new ApiError(404),
    new ApiError(409),
    new ApiError(422),
    new ApiError(500),
    new Error(NETWORK_ERROR_MESSAGE),
  ])("propagates save failures unchanged: %p", async (error) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(saveRecipeImport(TOKEN, IMPORT_ID, { title: TITLE })).rejects.toBe(error);
  });
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

  it.each([new ApiError(401), new ApiError(422), new ApiError(500), new Error(NETWORK_ERROR_MESSAGE)])(
    "propagates request failures unchanged: %p",
    async (error) => {
      jest.spyOn(client, "apiFetch").mockRejectedValue(error);

      await expect(previewRecipeImport(TOKEN, { url: URL })).rejects.toBe(error);
    },
  );
});

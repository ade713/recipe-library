import type { RecipeDetailResponse, RecipeListResponse, RecipeSummary } from "@/types/recipe";

import * as client from "../client";
import { ApiError } from "../errors";
import { getRecipe, listRecipes } from "../recipes";

const TEST_ACCESS_TOKEN = "test-access-token";
const RECIPES_PATH = "/recipes";
const RECIPE_ID = "test_recipe_id";
const RECIPE_TITLE = "Chicken Wings";
const IMAGE_URL = "https://example.com/chicken-wings";
const BASE_SERVINGS = "4";
const TIME_MINUTES = 35;
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPE_DETAIL_ERROR_MESSAGE = "Expected a recipe detail response";
const NETWORK_ERROR_MESSAGE = "Network unavailable";

describe("listRecipes", () => {
  it("returns recipes using the supplied access token", async () => {
    const recipeSummary: RecipeSummary = {
      id: RECIPE_ID,
      title: RECIPE_TITLE,
      image_url: IMAGE_URL,
      base_servings: BASE_SERVINGS,
      total_time_minutes: TIME_MINUTES,
      is_favorite: false,
      tags: [],
    };
    const recipeListResponse: RecipeListResponse = {
      items: [recipeSummary],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipeListResponse);

    const response = await listRecipes(TEST_ACCESS_TOKEN);

    expect(response).toBe(recipeListResponse);
    expect(requestMock).toHaveBeenCalledWith(RECIPES_PATH, {
      method: "GET",
      headers: { Authorization: `Bearer ${TEST_ACCESS_TOKEN}` },
    });
  });

  it("returns an empty recipe list", async () => {
    const recipeListResponse: RecipeListResponse = {
      items: [],
    };

    jest.spyOn(client, "apiFetch").mockResolvedValue(recipeListResponse);

    const response = await listRecipes(TEST_ACCESS_TOKEN);

    expect(response).toBe(recipeListResponse);
  });

  it("rejects a missing recipe list response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(listRecipes(TEST_ACCESS_TOKEN)).rejects.toThrow(RECIPE_LIST_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates API client failures: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(listRecipes(TEST_ACCESS_TOKEN)).rejects.toBe(error);
  });
});

describe("getRecipe", () => {
  it("rejects a missing recipe detail response", async () => {
    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(getRecipe(TEST_ACCESS_TOKEN, RECIPE_ID)).rejects.toThrow(RECIPE_DETAIL_ERROR_MESSAGE);

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}/${RECIPE_ID}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
      },
    });
  });

  it("returns the requested recipe detail", async () => {
    const recipe: RecipeDetailResponse = {
      id: RECIPE_ID,
      title: RECIPE_TITLE,
      image_url: null,
      total_time_minutes: TIME_MINUTES,
      base_servings: BASE_SERVINGS,
      is_favorite: false,
      tags: [],
      description: null,
      source_url: null,
      source_domain: null,
      source_site_name: null,
      source_author: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      servings_unit: null,
      ingredients: [],
      steps: [],
      tips: [],
    };

    jest.spyOn(client, "apiFetch").mockResolvedValue(recipe);

    const result = await getRecipe(TEST_ACCESS_TOKEN, RECIPE_ID);

    expect(result).toBe(recipe);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "not found", error: new ApiError(404) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates API client failures: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(getRecipe(TEST_ACCESS_TOKEN, RECIPE_ID)).rejects.toBe(error);
  });
});

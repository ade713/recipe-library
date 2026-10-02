import { makeRecipeDetailResponse, makeRecipeSummary } from "@/test/fixtures/recipes";
import type { RecipeListResponse } from "@/types/recipe";

import * as client from "../client";
import { ApiError } from "../errors";
import { getRecipe, listRecipes } from "../recipes";

const BASE_SERVINGS = "4";
const IMAGE_URL = "https://example.com/chicken-wings";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const RECIPE_DETAIL_ERROR_MESSAGE = "Expected a recipe detail response";
const RECIPE_ID = "test_recipe_id";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPE_TITLE = "Chicken Wings";
const RECIPES_PATH = "/recipes";
const TEST_ACCESS_TOKEN = "test-access-token";
const TIME_MINUTES = 35;

describe("listRecipes", () => {
  it("returns recipes using the supplied access token", async () => {
    const recipe = makeRecipeSummary({
      id: RECIPE_ID,
      title: RECIPE_TITLE,
      image_url: IMAGE_URL,
      base_servings: BASE_SERVINGS,
      total_time_minutes: TIME_MINUTES,
    });
    const recipeListResponse: RecipeListResponse = {
      items: [recipe],
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
    const recipe = makeRecipeDetailResponse({
      id: RECIPE_ID,
      title: RECIPE_TITLE,
      image_url: IMAGE_URL,
      base_servings: BASE_SERVINGS,
      total_time_minutes: TIME_MINUTES,
    });

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

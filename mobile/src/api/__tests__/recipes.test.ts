import { makeRecipeDetailResponse, makeRecipeSummary } from "@/test/fixtures/recipes";
import type { RecipeListResponse } from "@/types/recipe";

import * as client from "../client";
import { ApiError } from "../errors";
import { getRecipe, listRecipes, setRecipeFavorite } from "../recipes";

const BASE_SERVINGS = "4";
const IMAGE_URL = "https://example.com/chicken-wings";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const RECIPE_DETAIL_ERROR_MESSAGE = "Expected a recipe detail response";
const RECIPE_ID = "test_recipe_id";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPE_TITLE = "Chicken Wings";
const RECIPES_PATH = "/recipes";
const ACCESS_TOKEN = "test-access-token";
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

    const response = await listRecipes(ACCESS_TOKEN);

    expect(response).toBe(recipeListResponse);
    expect(requestMock).toHaveBeenCalledWith(RECIPES_PATH, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
  });

  it("returns an empty recipe list", async () => {
    const recipeListResponse: RecipeListResponse = {
      items: [],
    };

    jest.spyOn(client, "apiFetch").mockResolvedValue(recipeListResponse);

    const response = await listRecipes(ACCESS_TOKEN);

    expect(response).toBe(recipeListResponse);
  });

  it("rejects a missing recipe list response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(listRecipes(ACCESS_TOKEN)).rejects.toThrow(RECIPE_LIST_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates API client failures: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(listRecipes(ACCESS_TOKEN)).rejects.toBe(error);
  });

  it("requests recipes matching a search query", async () => {
    const recipeList: RecipeListResponse = {
      items: [makeRecipeSummary()],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipeList);

    const result = await listRecipes(ACCESS_TOKEN, { query: "chicken soup" });

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}?q=chicken+soup`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    expect(result).toBe(recipeList);
  });

  it("requests all recipes when the search query is empty", async () => {
    const recipeList: RecipeListResponse = {
      items: [makeRecipeSummary()],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipeList);

    await listRecipes(ACCESS_TOKEN, { query: "" });

    expect(requestMock).toHaveBeenCalledWith(RECIPES_PATH, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
  });

  it("encodes special characters in the search query", async () => {
    const recipeList: RecipeListResponse = {
      items: [makeRecipeSummary()],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipeList);

    await listRecipes(ACCESS_TOKEN, { query: "mac & cheese" });

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}?q=mac+%26+cheese`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
  });

  it.each([true, false])("requests recipes with the favorite filter %s", async (favorite) => {
    const recipeList: RecipeListResponse = {
      items: [makeRecipeSummary()],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipeList);

    const result = await listRecipes(ACCESS_TOKEN, { favorite });

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}?favorite=${favorite}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    expect(result).toBe(recipeList);
  });

  it("combines a search query with the favorite filter", async () => {
    const favoriteRecipe = makeRecipeSummary({
      id: "favorite-recipe-id",
      title: "Chicken Soup Recipe",
      is_favorite: true,
    });
    const recipeList: RecipeListResponse = {
      items: [favoriteRecipe],
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipeList);

    const result = await listRecipes(ACCESS_TOKEN, { query: "chicken soup", favorite: true });

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}?q=chicken+soup&favorite=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    });
    expect(result).toBe(recipeList);
  });
});

describe("getRecipe", () => {
  it("rejects a missing recipe detail response", async () => {
    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(getRecipe(ACCESS_TOKEN, RECIPE_ID)).rejects.toThrow(RECIPE_DETAIL_ERROR_MESSAGE);

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}/${RECIPE_ID}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
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

    const result = await getRecipe(ACCESS_TOKEN, RECIPE_ID);

    expect(result).toBe(recipe);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "not found", error: new ApiError(404) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates API client failures: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(getRecipe(ACCESS_TOKEN, RECIPE_ID)).rejects.toBe(error);
  });
});

describe("setRecipeFavorite", () => {
  it.each([true, false])("sets recipe favorite status to %s and returns the updated recipe", async (isFavorite) => {
    const recipe = makeRecipeDetailResponse({
      is_favorite: isFavorite,
    });

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(recipe);

    const result = await setRecipeFavorite(ACCESS_TOKEN, RECIPE_ID, isFavorite);

    expect(requestMock).toHaveBeenCalledWith(`${RECIPES_PATH}/${RECIPE_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ is_favorite: isFavorite }),
    });
    expect(result).toBe(recipe);
  });

  it("rejects an empty favorite update response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(setRecipeFavorite(ACCESS_TOKEN, RECIPE_ID, true)).rejects.toThrow(RECIPE_DETAIL_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates favorite update failure: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(setRecipeFavorite(ACCESS_TOKEN, RECIPE_ID, true)).rejects.toBe(error);
  });
});

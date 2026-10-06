import type { RecipeListResponse } from "@/types/recipe";
import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";

import * as recipesApi from "../../api/recipes";
import * as tokenStorage from "../../auth/token-storage";
import { loadRecipe, loadRecipes, updateRecipeFavorite } from "../recipe-service";

const NETWORK_ERROR_MESSAGE = "Network unavailable";
const RECIPE_ID = "test_recipe_id";
const RECIPE_REQUEST_ERROR_MESSAGE = "Unexpected recipe request";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const ACCESS_TOKEN = "test-access-token";
const TOKEN_ERROR_MESSAGE = "No access token available";

const makeRecipeListResponse = (): RecipeListResponse => {
  return {
    items: [],
  };
};

describe("loadRecipes", () => {
  it("loads recipes using the stored access token", async () => {
    const recipeListResponse = makeRecipeListResponse();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const recipesMock = jest.spyOn(recipesApi, "listRecipes").mockResolvedValue(recipeListResponse);

    const response = await loadRecipes();

    expect(recipesMock).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(response).toBe(recipeListResponse);
  });

  it("rejects without requesting recipes when no token is stored", async () => {
    const recipeListResponse = makeRecipeListResponse();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const recipesMock = jest.spyOn(recipesApi, "listRecipes").mockResolvedValue(recipeListResponse);

    await expect(loadRecipes()).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(recipesMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without requesting recipes", async () => {
    const recipeListResponse = makeRecipeListResponse();
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const recipesMock = jest.spyOn(recipesApi, "listRecipes").mockResolvedValue(recipeListResponse);

    await expect(loadRecipes()).rejects.toBe(error);
    expect(recipesMock).not.toHaveBeenCalled();
  });

  it("propagates recipe API failures", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(recipesApi, "listRecipes").mockRejectedValue(error);

    await expect(loadRecipes()).rejects.toBe(error);
  });
});

describe("loadRecipe", () => {
  it("rejects without requesting a recipe when no token is stored", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const recipeMock = jest.spyOn(recipesApi, "getRecipe").mockImplementation(() => {
      throw new Error(RECIPE_REQUEST_ERROR_MESSAGE);
    });

    await expect(loadRecipe(RECIPE_ID)).rejects.toThrow(TOKEN_ERROR_MESSAGE);

    expect(recipeMock).not.toHaveBeenCalled();
  });

  it("loads the selected recipe using the stored token", async () => {
    const recipe = makeRecipeDetailResponse();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const recipeMock = jest.spyOn(recipesApi, "getRecipe").mockResolvedValue(recipe);

    const result = await loadRecipe(recipe.id);

    expect(recipeMock).toHaveBeenCalledWith(ACCESS_TOKEN, recipe.id);
    expect(result).toBe(recipe);
  });

  it("propagates storage failures without requesting a recipe", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const recipeMock = jest.spyOn(recipesApi, "getRecipe").mockImplementation(() => {
      throw new Error(RECIPE_REQUEST_ERROR_MESSAGE);
    });

    await expect(loadRecipe(RECIPE_ID)).rejects.toBe(error);
    expect(recipeMock).not.toHaveBeenCalled();
  });

  it("propagates recipe API failures", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(recipesApi, "getRecipe").mockRejectedValue(error);

    await expect(loadRecipe(RECIPE_ID)).rejects.toBe(error);
  });
});

describe("updateRecipeFavorite", () => {
  it.each([true, false])("updates favorite status to %s using the stored access token", async (isFavorite) => {
    const recipe = makeRecipeDetailResponse({
      is_favorite: isFavorite,
    });

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(recipesApi, "setRecipeFavorite").mockResolvedValue(recipe);
    const result = await updateRecipeFavorite(RECIPE_ID, isFavorite);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, RECIPE_ID, isFavorite);
    expect(result).toBe(recipe);
  });

  it("rejects without updating the recipe when no token is stored", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(recipesApi, "setRecipeFavorite").mockImplementation(() => {
      throw new Error(RECIPE_REQUEST_ERROR_MESSAGE);
    });

    await expect(updateRecipeFavorite(RECIPE_ID, true)).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without updating the recipe", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(recipesApi, "setRecipeFavorite").mockImplementation(() => {
      throw new Error(RECIPE_REQUEST_ERROR_MESSAGE);
    });

    await expect(updateRecipeFavorite(RECIPE_ID, true)).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates favorite update API failures", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(recipesApi, "setRecipeFavorite").mockRejectedValue(error);

    await expect(updateRecipeFavorite(RECIPE_ID, true)).rejects.toBe(error);
  });
});

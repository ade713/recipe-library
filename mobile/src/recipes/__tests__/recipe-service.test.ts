import type { RecipeListResponse } from "@/types/recipe";

import * as recipesApi from "../../api/recipes";
import * as tokenStorage from "../../auth/token-storage";
import { loadRecipes } from "../recipe-service";

const TEST_ACCESS_TOKEN = "test-access-token";
const TOKEN_ERROR_MESSAGE = "No access token available";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const NETWORK_ERROR_MESSAGE = "Network unavailable";

const makeRecipeListResponse = (): RecipeListResponse => {
  return {
    items: [],
  };
};

describe("loadRecipes", () => {
  it("loads recipes using the stored access token", async () => {
    const recipeListResponse = makeRecipeListResponse();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(TEST_ACCESS_TOKEN);
    const recipesMock = jest.spyOn(recipesApi, "listRecipes").mockResolvedValue(recipeListResponse);

    const response = await loadRecipes();

    expect(recipesMock).toHaveBeenCalledWith(TEST_ACCESS_TOKEN);
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

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(TEST_ACCESS_TOKEN);
    jest.spyOn(recipesApi, "listRecipes").mockRejectedValue(error);

    await expect(loadRecipes()).rejects.toBe(error);
  });
});

import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { router } from "expo-router";

import { makeRecipeSummary } from "@/test/fixtures/recipes";
import { makeUserResponse } from "@/test/fixtures/users";
import type { RecipeListResponse, RecipeSummary } from "@/types/recipe";
import * as recipeService from "@/recipes/recipe-service";

import { AuthProvider } from "../auth-provider";
import RecipeLibraryScreen from "../../../app/index";
import * as session from "../session";

const BASE_SERVINGS = "4";
const IMAGE_URL = "https://example.com/chicken-wings";
const INDEX_PATH = "/";
const LOAD_RECIPES_ERROR_MESSAGE = "Unable to load recipes.";
const LOADING_RECIPES_MESSAGE = "Loading recipes...";
const NO_RECIPES_MESSAGE = "No saved recipes yet.";
const RECIPE_ID = "test_recipe_id";
const RECIPE_ID_2 = "test_recipe_id_2";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RECIPE_TITLE = "Chicken Wings";
const RECIPE_TITLE_2 = "Honey Garlic Chicken Wings";
const RETRY_TEXT = "Retry";
const SIGN_OUT_ERROR_MESSAGE = "Unable to sign out. Please try again.";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const TIME_MINUTES = 35;

const makeRecipeListResponse = (items: RecipeSummary[] = []): RecipeListResponse => ({
  items,
});

const renderRecipeLibraryScreen = async () => {
  await renderRouter(
    {
      index: () => (
        <AuthProvider>
          <RecipeLibraryScreen />
        </AuthProvider>
      ),
    },
    { initialUrl: INDEX_PATH },
  );
};

describe("RecipeLibraryScreen", () => {
  it("shows safe feedback and re-enables sign-out after failure", async () => {
    const user = makeUserResponse();
    const recipes = makeRecipeListResponse();
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue(recipes);
    jest.spyOn(session, "signOut").mockRejectedValue(error);

    await renderRecipeLibraryScreen();

    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    await fireEvent.press(signOutButton);

    expect(await screen.findByText(SIGN_OUT_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(STORAGE_ERROR_MESSAGE)).toBeNull();
    expect(signOutButton).toBeEnabled();
  });

  it("prevents another sign-out while removal is pending", async () => {
    const user = makeUserResponse();
    const recipes = makeRecipeListResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue(recipes);
    const signOutMock = jest.spyOn(session, "signOut").mockImplementation(() => new Promise(() => {}));

    await renderRecipeLibraryScreen();

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    await act(async () => {
      void fireEvent.press(signOutButton);
    });

    await waitFor(() => {
      expect(signOutButton).toBeDisabled();
    });

    await fireEvent.press(signOutButton);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("shows loading feedback while recipes are loading", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const recipesMock = jest.spyOn(recipeService, "loadRecipes").mockImplementation(() => new Promise(() => {}));

    await renderRecipeLibraryScreen();

    expect(await screen.findByText(LOADING_RECIPES_MESSAGE)).toBeTruthy();
    expect(recipesMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(NO_RECIPES_MESSAGE)).toBeNull();
  });

  it("shows safe feedback when loading recipes fails", async () => {
    const user = makeUserResponse();
    const error = new Error(RECIPE_LIST_ERROR_MESSAGE);

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockRejectedValue(error);

    await renderRecipeLibraryScreen();

    expect(await screen.findByText(LOAD_RECIPES_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(RECIPE_LIST_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_RECIPES_MESSAGE)).toBeNull();
    expect(screen.queryByText(NO_RECIPES_MESSAGE)).toBeNull();
  });

  it("displays loaded recipe summaries", async () => {
    const user = makeUserResponse();
    const recipe1 = makeRecipeSummary({
      id: RECIPE_ID,
      title: RECIPE_TITLE,
      image_url: IMAGE_URL,
      base_servings: BASE_SERVINGS,
      total_time_minutes: TIME_MINUTES,
    });
    const recipe2 = makeRecipeSummary({
      id: RECIPE_ID_2,
      title: RECIPE_TITLE_2,
      image_url: IMAGE_URL,
      base_servings: BASE_SERVINGS,
      total_time_minutes: TIME_MINUTES,
    });
    const items = [recipe1, recipe2];
    const recipes = makeRecipeListResponse(items);

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue(recipes);

    await renderRecipeLibraryScreen();

    expect(await screen.findByText(RECIPE_TITLE)).toBeTruthy();
    expect(screen.getByText(RECIPE_TITLE_2)).toBeTruthy();
    expect(screen.queryByText(LOADING_RECIPES_MESSAGE)).toBeNull();
    expect(screen.queryByText(NO_RECIPES_MESSAGE)).toBeNull();
    expect(screen.getAllByText("35 min")).toHaveLength(2);
    expect(screen.getAllByText("Servings: 4")).toHaveLength(2);
  });

  it("shows an empty-library message when no recipes are returned", async () => {
    const user = makeUserResponse();
    const noRecipes = makeRecipeListResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue(noRecipes);

    await renderRecipeLibraryScreen();

    expect(await screen.findByText(NO_RECIPES_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(LOADING_RECIPES_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOAD_RECIPES_ERROR_MESSAGE)).toBeNull();
  });

  it("loads recipes successfully after retrying a failed request", async () => {
    const user = makeUserResponse();
    const items = [makeRecipeSummary()];
    const recipes = makeRecipeListResponse(items);
    const error = new Error(RECIPE_LIST_ERROR_MESSAGE);

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const recipesMock = jest
      .spyOn(recipeService, "loadRecipes")
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(recipes);

    await renderRecipeLibraryScreen();

    await screen.findByText(LOAD_RECIPES_ERROR_MESSAGE);
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TEXT }));

    expect(await screen.findByText(RECIPE_TITLE)).toBeTruthy();
    expect(screen.queryByText(LOAD_RECIPES_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_RECIPES_MESSAGE)).toBeNull();
    expect(recipesMock).toHaveBeenCalledTimes(2);
  });

  it("shows loading feedback while a retry is pending", async () => {
    const user = makeUserResponse();
    const error = new Error(RECIPE_LIST_ERROR_MESSAGE);

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const recipeMock = jest
      .spyOn(recipeService, "loadRecipes")
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(() => new Promise(() => {}));

    await renderRecipeLibraryScreen();

    const retryButton = await screen.findByRole("button", { name: RETRY_TEXT });
    await fireEvent.press(retryButton);

    expect(await screen.findByText(LOADING_RECIPES_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(LOAD_RECIPES_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(NO_RECIPES_MESSAGE)).toBeNull();
    expect(screen.queryByRole("button", { name: RETRY_TEXT })).toBeNull();
    expect(recipeMock).toHaveBeenCalledTimes(2);
  });

  it("opens the selected recipe when its card is pressed", async () => {
    const user = makeUserResponse();
    const recipe = makeRecipeSummary({
      id: RECIPE_ID,
      title: RECIPE_TITLE,
      image_url: IMAGE_URL,
      base_servings: BASE_SERVINGS,
      total_time_minutes: TIME_MINUTES,
    });
    const recipeList = makeRecipeListResponse([recipe]);

    const pushMock = jest.spyOn(router, "push").mockImplementation(() => {});
    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue(recipeList);

    await renderRecipeLibraryScreen();

    await fireEvent.press(await screen.findByRole("button", { name: `Open ${recipe.title}` }));

    expect(pushMock).toHaveBeenCalledWith({
      pathname: "/recipes/[id]",
      params: { id: recipe.id },
    });
  });
});

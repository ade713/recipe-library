import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import type { RecipeListResponse, RecipeSummary } from "@/types/recipe";
import type { UserResponse } from "@/types/auth";
import * as recipeService from "@/recipes/recipe-service";

import { AuthProvider } from "../auth-provider";
import RecipeLibraryScreen from "../../../app/index";
import * as session from "../session";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const RECIPE_ID = "test_recipe_id";
const RECIPE_TITLE = "Chicken Wings";
const RECIPE_ID_2 = "test_recipe_id_2";
const RECIPE_TITLE_2 = "Honey Garlic Chicken Wings";
const IMAGE_URL = "https://example.com/chicken-wings";
const BASE_SERVINGS = "4";
const TIME_MINUTES = 35;
const NO_RECIPES_MESSAGE = "No saved recipes yet.";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const SIGN_OUT_ERROR_MESSAGE = "Unable to sign out. Please try again.";
const LOAD_RECIPES_ERROR_MESSAGE = "Unable to load recipes.";
const LOADING_RECIPES_MESSAGE = "Loading recipes...";
const RECIPE_LIST_ERROR_MESSAGE = "Expected a recipe list response";
const RETRY_TEXT = "Retry";

const makeUserResponse = (): UserResponse => ({
  id: TEST_USER_ID,
  email: TEST_EMAIL,
});
const makeRecipeSummary = ({
  id = RECIPE_ID,
  title = RECIPE_TITLE,
}: { id?: string; title?: string } = {}): RecipeSummary => ({
  id,
  title,
  image_url: IMAGE_URL,
  base_servings: BASE_SERVINGS,
  total_time_minutes: TIME_MINUTES,
  is_favorite: false,
  tags: [],
});
const makeRecipeListResponse = (items: RecipeSummary[] = []): RecipeListResponse => ({
  items,
});

const renderRecipeLibraryScreen = async () => {
  await render(
    <AuthProvider>
      <RecipeLibraryScreen />
    </AuthProvider>,
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
    const recipeSummary1 = makeRecipeSummary({ id: RECIPE_ID, title: RECIPE_TITLE });
    const recipeSummary2 = makeRecipeSummary({ id: RECIPE_ID_2, title: RECIPE_TITLE_2 });
    const items = [recipeSummary1, recipeSummary2];
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
});

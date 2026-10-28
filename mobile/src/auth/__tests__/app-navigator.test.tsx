import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { Text } from "react-native";
import type { ReactElement } from "react";

import { makeRecipeDetailResponse, makeRecipeSummary } from "@/test/fixtures/recipes";
import { makeUserResponse } from "@/test/fixtures/users";
import * as recipeService from "@/recipes/recipe-service";
import * as tagService from "@/tags/tag-service";

import { LoginScreen } from "../login-screen";
import { RegisterScreen } from "../register-screen";
import * as auth from "../../api/auth";
import * as session from "../session";
import NewRecipeScreen from "../../../app/recipes/new";
import RecipeDetailRoute from "../../../app/recipes/[id]";
import RecipeLibraryScreen from "../../../app/index";
import RootLayout from "../../../app/_layout";

const CREATE_ACCOUNT_TEXT = "Create account";
const CREATE_RECIPE_PATH = "/recipes/new";
const CREATE_RECIPE_TEXT = "Create recipe route";
const EMAIL = "test@example.com";
const FAVORITE_TEXT = "Favorite";
const INDEX_PATH = "/";
const LIBRARY_TEXT = "Library route";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const LOGIN_PATH = "/login";
const LOGIN_TEXT = "Login route";
const PASSWORD = "testPassword1";
const RECIPE_DETAIL_PATH = "/recipes/recipe-1";
const RECIPE_DETAIL_TEXT = "Recipe detail route";
const RECIPE_ID = "recipe-1";
const RECIPE_TITLE = "Chicken Soup";
const RECIPE_TITLE_LABEL = "Recipe title";
const REGISTER_PATH = "/register";
const REGISTER_TEXT = "Registration route";
const SAVE_RECIPE_TEXT = "Save recipe";
const SEARCH_TAGS_LABEL = "Search tags";
const SIGN_IN_TEXT = "Sign in";
const TAG_ID = "tag-dinner";
const TAG_NAME = "Dinner";
const TAGS_EMPTY_MESSAGE = "No tags yet.";
const TAGS_LOADING_MESSAGE = "Loading tags...";
const TAGS_SEARCH_EMPTY_MESSAGE = "No matching tags.";

type RouteOptions = {
  createRecipe?: () => ReactElement;
  detail?: () => ReactElement | null;
  index?: () => ReactElement;
  login?: () => ReactElement;
  register?: () => ReactElement;
};

const renderRouteNavigation = async (
  initialUrl: string,
  {
    createRecipe = () => <Text>{CREATE_RECIPE_TEXT}</Text>,
    detail = () => <Text>{RECIPE_DETAIL_TEXT}</Text>,
    index = () => <Text>{LIBRARY_TEXT}</Text>,
    login = () => <Text>{LOGIN_TEXT}</Text>,
    register = () => <Text>{REGISTER_TEXT}</Text>,
  }: RouteOptions = {},
) => {
  const navigation = renderRouter(
    {
      _layout: RootLayout,
      "recipes/new/index": createRecipe,
      index,
      login,
      register,
      "recipes/[id]": detail,
    },
    { initialUrl },
  );

  await navigation;

  return { navigation };
};

describe("AppNavigator", () => {
  beforeEach(() => {
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [] });
  });

  afterEach(() => jest.useRealTimers());

  it("redirects signed-out users from the library to login", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);

    await renderRouteNavigation(INDEX_PATH);

    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(screen.queryByText(LIBRARY_TEXT)).toBeNull();
  });

  it("redirects authenticated users from login to the library", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);

    await renderRouteNavigation(LOGIN_PATH);

    expect(await screen.findByText(LIBRARY_TEXT)).toBeTruthy();
    expect(screen.queryByText(LOGIN_TEXT)).toBeNull();
  });

  it("opens the library after successful sign-in", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    jest.spyOn(session, "signIn").mockResolvedValue(user);

    await renderRouteNavigation(LOGIN_PATH, {
      login: LoginScreen,
    });

    await fireEvent.changeText(await screen.findByLabelText("Email"), EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(LIBRARY_TEXT)).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("opens login after signing out from the library", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue({ items: [] });
    const signOutMock = jest.spyOn(session, "signOut").mockResolvedValue(undefined);

    await renderRouteNavigation(INDEX_PATH, {
      index: RecipeLibraryScreen,
    });

    await fireEvent.press(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(screen.queryByText("Your recipe library.")).toBeNull();
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("opens registration from the login screen", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);

    await renderRouteNavigation(LOGIN_PATH, {
      login: LoginScreen,
    });

    await fireEvent.press(await screen.findByRole("link", { name: CREATE_ACCOUNT_TEXT }));

    expect(await screen.findByText(REGISTER_TEXT)).toBeTruthy();
  });

  it("returns to login after successful registration", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    jest.spyOn(auth, "register").mockResolvedValue(user);

    await renderRouteNavigation(REGISTER_PATH, {
      register: RegisterScreen,
    });

    await fireEvent.changeText(await screen.findByLabelText("Email"), EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: CREATE_ACCOUNT_TEXT }));

    await fireEvent.press(await screen.findByRole("link", { name: SIGN_IN_TEXT }));

    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(screen.queryByText(LIBRARY_TEXT)).toBeNull();
  });

  it("redirects signed-out users from recipe detail to login", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);

    await renderRouteNavigation(RECIPE_DETAIL_PATH);

    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(screen.queryByText(RECIPE_DETAIL_TEXT)).toBeNull();
  });

  it("allows authenticated users to open recipe detail", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);

    await renderRouteNavigation(RECIPE_DETAIL_PATH);

    expect(await screen.findByText(RECIPE_DETAIL_TEXT)).toBeTruthy();
    expect(screen.queryByText(LOGIN_TEXT)).toBeNull();
  });

  it("opens recipe detail from the library", async () => {
    const user = makeUserResponse();
    const recipe = makeRecipeSummary({
      id: RECIPE_ID,
      title: "Tomato Soup",
    });

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue({
      items: [recipe],
    });

    await renderRouteNavigation(INDEX_PATH, {
      index: RecipeLibraryScreen,
    });

    await fireEvent.press(await screen.findByRole("button", { name: `Open ${recipe.title}` }));

    expect(await screen.findByText(RECIPE_DETAIL_TEXT)).toBeTruthy();
  });

  it("loads recipe detail using the route ID", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const loadMock = jest.spyOn(recipeService, "loadRecipe").mockImplementation(() => new Promise(() => {}));

    await renderRouteNavigation(RECIPE_DETAIL_PATH, {
      detail: RecipeDetailRoute,
    });

    expect(await screen.findByText(LOADING_RECIPE_TEXT)).toBeTruthy();
    expect(loadMock).toHaveBeenCalledWith(RECIPE_ID);
  });

  it("refreshes recipe favorites when returning to the library", async () => {
    const user = makeUserResponse();
    const recipe = makeRecipeSummary();
    const favoriteRecipe = makeRecipeSummary({
      is_favorite: true,
    });

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest
      .spyOn(recipeService, "loadRecipes")
      .mockResolvedValueOnce({
        items: [recipe],
      })
      .mockResolvedValue({
        items: [favoriteRecipe],
      });

    await renderRouteNavigation(INDEX_PATH, {
      index: RecipeLibraryScreen,
    });

    const recipeButton = await screen.findByRole("button", { name: `Open ${recipe.title}` });

    expect(screen.queryByText(FAVORITE_TEXT)).toBeNull();

    await fireEvent.press(recipeButton);

    expect(await screen.findByText(RECIPE_DETAIL_TEXT)).toBeTruthy();

    await act(async () => {
      router.back();
    });

    expect(await screen.findByText(FAVORITE_TEXT)).toBeTruthy();
  });

  it("preserves submitted search, filters, and sorting when returning to the library", async () => {
    const searchRecipesText = "Search recipes";
    const searchQuery = "chicken";
    const searchButtonText = "Search";
    const favoritesButtonTitle = "Favorites";
    const sortTitle = "title";
    const sortTitleAZButtonTitle = "Title A–Z";
    const filterMaxTotalTimeTitle = "30 min or less";
    const totalTime = 30;
    const user = makeUserResponse();
    const recipe = makeRecipeSummary();
    const otherRecipe = makeRecipeSummary({
      id: "other-recipe-id",
      title: "Other Good Recipe",
    });
    const favoriteRecipe = makeRecipeSummary({
      id: "favorite-recipe-id",
      title: "Favorite Chicken Recipe",
      is_favorite: true,
      total_time_minutes: totalTime,
    });

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const recipesMock = jest
      .spyOn(recipeService, "loadRecipes")
      .mockResolvedValueOnce({
        items: [recipe, otherRecipe, favoriteRecipe],
      })
      .mockResolvedValueOnce({
        items: [favoriteRecipe],
      })
      .mockResolvedValueOnce({
        items: [favoriteRecipe],
      })
      .mockResolvedValueOnce({
        items: [favoriteRecipe],
      })
      .mockResolvedValueOnce({
        items: [favoriteRecipe],
      })
      .mockResolvedValueOnce({
        items: [favoriteRecipe],
      });

    await renderRouteNavigation(INDEX_PATH, {
      index: RecipeLibraryScreen,
    });

    await fireEvent.press(screen.getByRole("button", { name: favoritesButtonTitle }));
    await screen.findByText(favoriteRecipe.title);
    await fireEvent.press(screen.getByRole("button", { name: `Sort by: ${sortTitleAZButtonTitle}` }));
    await screen.findByText(favoriteRecipe.title);
    await fireEvent.press(screen.getByRole("button", { name: filterMaxTotalTimeTitle }));
    await screen.findByText(favoriteRecipe.title);
    await fireEvent.changeText(await screen.findByLabelText(searchRecipesText), searchQuery);
    await fireEvent.press(await screen.findByRole("button", { name: searchButtonText }));
    await screen.findByText(favoriteRecipe.title);
    await fireEvent.changeText(await screen.findByLabelText(searchRecipesText), "soup");

    await fireEvent.press(screen.getByRole("button", { name: `Open ${favoriteRecipe.title}` }));
    await screen.findByText(RECIPE_DETAIL_TEXT);

    await act(async () => {
      router.back();
    });

    await waitFor(() => {
      expect(recipesMock).toHaveBeenCalledTimes(6);
    });

    expect(recipesMock).toHaveBeenLastCalledWith({
      query: searchQuery,
      favorite: true,
      sort: sortTitle,
      maxTotalTime: totalTime,
    });
  });

  it("opens recipe creation from the library", async () => {
    const createRecipeButtonText = "Create recipe";
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "loadRecipes").mockResolvedValue({
      items: [],
    });

    await renderRouteNavigation(INDEX_PATH, {
      index: RecipeLibraryScreen,
    });

    await fireEvent.press(await screen.findByRole("button", { name: createRecipeButtonText }));

    expect(await screen.findByText(CREATE_RECIPE_TEXT)).toBeTruthy();
  });

  it("redirects signed-out users from recipe creation to login", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);

    await renderRouteNavigation(CREATE_RECIPE_PATH);

    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(screen.queryByText(CREATE_RECIPE_TEXT)).toBeNull();
  });

  it("keeps recipe entry available while tags load", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    jest.spyOn(tagService, "loadTags").mockImplementation(() => new Promise(() => {}));

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    expect(await screen.findByText(TAGS_LOADING_MESSAGE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_LABEL), RECIPE_TITLE);

    expect(screen.getByLabelText(RECIPE_TITLE_LABEL)).toHaveDisplayValue(RECIPE_TITLE);
    expect(screen.getByRole("button", { name: SAVE_RECIPE_TEXT })).toBeEnabled();
  });

  it("shows an empty tag state without blocking recipe entry", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    expect(await screen.findByText(TAGS_EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(TAGS_LOADING_MESSAGE)).toBeNull();
    expect(screen.getByRole("button", { name: SAVE_RECIPE_TEXT })).toBeEnabled();
  });

  it("retries tag loading without losing entered recipe text", async () => {
    const tagsPrivateErrorMessage = "Private tag error";
    const tagsLoadingErrorMessage = "Unable to load tags.";
    const tagRetryButtonLabel = "Retry tags";

    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    const loadMock = jest
      .spyOn(tagService, "loadTags")
      .mockRejectedValueOnce(new Error(tagsPrivateErrorMessage))
      .mockResolvedValueOnce({ items: [{ id: TAG_ID, name: TAG_NAME }] });

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    expect(await screen.findByText(tagsLoadingErrorMessage)).toBeTruthy();
    expect(screen.queryByText(tagsPrivateErrorMessage)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_LABEL), RECIPE_TITLE);
    expect(screen.getByRole("button", { name: SAVE_RECIPE_TEXT })).toBeEnabled();
    await fireEvent.press(screen.getByRole("button", { name: tagRetryButtonLabel }));

    await fireEvent.changeText(await screen.findByLabelText(SEARCH_TAGS_LABEL), TAG_NAME);
    expect(await screen.findByText(TAG_NAME)).toBeTruthy();
    expect(screen.getByLabelText(RECIPE_TITLE_LABEL)).toHaveDisplayValue(RECIPE_TITLE);
    expect(screen.queryByText(tagsLoadingErrorMessage)).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("searches tags without showing the full list for a blank query", async () => {
    const dinnerTag = { id: TAG_ID, name: TAG_NAME };
    const quickTag = { id: "tag-quick", name: "Quick" };
    const searchTerm = "  DIN  ";
    const blankSearchTerm = "   ";

    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [dinnerTag, quickTag] });

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });
    const search = await screen.findByLabelText(SEARCH_TAGS_LABEL);

    expect(screen.queryByText(dinnerTag.name)).toBeNull();
    expect(screen.queryByText(quickTag.name)).toBeNull();

    await fireEvent.changeText(search, searchTerm);

    expect(search).toHaveDisplayValue(searchTerm);
    expect(screen.getByText(dinnerTag.name)).toBeTruthy();
    expect(screen.queryByText(quickTag.name)).toBeNull();

    await fireEvent.changeText(search, blankSearchTerm);

    expect(screen.queryByText(dinnerTag.name)).toBeNull();
    expect(screen.queryByText(TAGS_SEARCH_EMPTY_MESSAGE)).toBeNull();
  });

  it("distinguishes an unmatched search from having no available tags", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [{ id: TAG_ID, name: TAG_NAME }] });

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    const search = await screen.findByLabelText(SEARCH_TAGS_LABEL);
    await fireEvent.changeText(search, "Breakfast");

    expect(screen.getByText(TAGS_SEARCH_EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(TAGS_EMPTY_MESSAGE)).toBeNull();

    await fireEvent.changeText(search, TAG_NAME);
    expect(screen.getByText(TAG_NAME)).toBeTruthy();
    expect(screen.queryByText(TAGS_SEARCH_EMPTY_MESSAGE)).toBeNull();
  });

  it("limits suggestions after filtering so later tags remain searchable", async () => {
    const tags = Array.from({ length: 8 }, (_, index) => ({
      id: `tag-${index + 1}`,
      name: `Dinner ${index + 1}`,
    }));

    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: tags });

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    const search = await screen.findByLabelText(SEARCH_TAGS_LABEL);
    await fireEvent.changeText(search, TAG_NAME);

    for (const tag of tags.slice(0, 5)) {
      expect(screen.getByText(tag.name)).toBeTruthy();
    }
    for (const tag of tags.slice(5)) {
      expect(screen.queryByText(tag.name)).toBeNull();
    }

    await fireEvent.changeText(search, "Dinner 8");

    expect(screen.getByText("Dinner 8")).toBeTruthy();
    expect(screen.queryByText("Dinner 1")).toBeNull();
  });

  it("selects multiple tags, clears search, and removes only the chosen chip", async () => {
    const quickTag = { id: "tag-quick", name: "Quick" };
    const selectDinnerLabel = `Select tag ${TAG_NAME}`;
    const removeDinnerLabel = `Remove tag ${TAG_NAME}`;
    const selectQuickLabel = `Select tag ${quickTag.name}`;
    const removeQuickLabel = `Remove tag ${quickTag.name}`;

    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    jest.spyOn(tagService, "loadTags").mockResolvedValue({
      items: [{ id: TAG_ID, name: TAG_NAME }, quickTag],
    });

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    const search = await screen.findByLabelText(SEARCH_TAGS_LABEL);
    await fireEvent.changeText(search, TAG_NAME);
    await fireEvent.press(screen.getByRole("button", { name: selectDinnerLabel }));

    expect(search).toHaveDisplayValue("");
    expect(screen.getByRole("button", { name: removeDinnerLabel })).toBeTruthy();
    expect(screen.queryByRole("button", { name: selectDinnerLabel })).toBeNull();

    await fireEvent.changeText(search, TAG_NAME);
    expect(screen.queryByRole("button", { name: selectDinnerLabel })).toBeNull();
    expect(screen.getAllByRole("button", { name: removeDinnerLabel })).toHaveLength(1);

    await fireEvent.changeText(search, quickTag.name);
    await fireEvent.press(screen.getByRole("button", { name: selectQuickLabel }));
    expect(search).toHaveDisplayValue("");
    expect(screen.getByRole("button", { name: removeDinnerLabel })).toBeTruthy();
    expect(screen.getByRole("button", { name: removeQuickLabel })).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: removeDinnerLabel }));
    expect(screen.queryByRole("button", { name: removeDinnerLabel })).toBeNull();
    expect(screen.getByRole("button", { name: removeQuickLabel })).toBeTruthy();

    await fireEvent.changeText(search, TAG_NAME);
    expect(screen.getByRole("button", { name: selectDinnerLabel })).toBeTruthy();
  });

  it("excludes selected tags before limiting suggestions", async () => {
    const tags = Array.from({ length: 6 }, (_, index) => ({
      id: `tag-${index + 1}`,
      name: `Dinner ${index + 1}`,
    }));

    jest.spyOn(session, "restoreSession").mockResolvedValue(makeUserResponse());
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: tags });

    await renderRouteNavigation(CREATE_RECIPE_PATH, { createRecipe: NewRecipeScreen });

    const search = await screen.findByLabelText(SEARCH_TAGS_LABEL);
    await fireEvent.changeText(search, "Dinner");
    await fireEvent.press(screen.getByRole("button", { name: "Select tag Dinner 1" }));
    await fireEvent.changeText(search, "Dinner");

    expect(screen.queryByRole("button", { name: "Select tag Dinner 1" })).toBeNull();
    for (const tag of tags.slice(1)) {
      expect(screen.getByRole("button", { name: `Select tag ${tag.name}` })).toBeTruthy();
    }
  });

  it("saves a new recipe and opens its detail screen", async () => {
    const description = "A comforting recipe.\nServe with friends.";
    const sourceUrl = "https://example.com/recipe?lang=en#ingredients";
    const imageUrl = "https://images.example.com/soup?size=large";
    const recipe = makeRecipeDetailResponse({ title: RECIPE_TITLE, description });
    const ingredientLabel = "Ingredient 1";
    const ingredient1 = "2 cups flour";
    const stepLabel = "Step 1";
    const step1 = "Mix the ingredients.";
    const tipLabel = "Tip 1";
    const tip1 = "Serve warm";
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const saveMock = jest.spyOn(recipeService, "saveRecipe").mockResolvedValue(recipe);

    const { navigation } = await renderRouteNavigation(CREATE_RECIPE_PATH, {
      createRecipe: NewRecipeScreen,
    });

    await fireEvent.changeText(await screen.findByLabelText(RECIPE_TITLE_LABEL), recipe.title);
    await fireEvent.changeText(screen.getByLabelText(ingredientLabel), ingredient1);
    await fireEvent.changeText(screen.getByLabelText(stepLabel), step1);
    await fireEvent.changeText(screen.getByLabelText(tipLabel), tip1);
    await fireEvent.changeText(screen.getByLabelText("Prep time (minutes)"), "10");
    await fireEvent.changeText(screen.getByLabelText("Cook time (minutes)"), "0");
    await fireEvent.changeText(screen.getByLabelText("Total time (minutes)"), "30");
    await fireEvent.changeText(screen.getByLabelText("Servings or yield quantity"), "1.5");
    await fireEvent.changeText(screen.getByLabelText("Yield unit (optional)"), "loaves");
    await fireEvent.changeText(screen.getByLabelText("Description (optional)"), description);
    await fireEvent.changeText(screen.getByLabelText("Original recipe URL (optional)"), sourceUrl);
    await fireEvent.changeText(screen.getByLabelText("Image URL (optional)"), imageUrl);
    await fireEvent(screen.getByRole("switch", { name: "Favorite" }), "valueChange", true);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_TEXT }));

    expect(saveMock).toHaveBeenCalledWith({
      title: recipe.title,
      description,
      source_url: sourceUrl,
      image_url: imageUrl,
      is_favorite: true,
      ingredients: [{ position: 1, original_text: ingredient1 }],
      steps: [{ position: 1, instruction: step1 }],
      tips: [{ position: 1, tip: tip1 }],
      prep_time_minutes: 10,
      cook_time_minutes: 0,
      total_time_minutes: 30,
      base_servings: 1.5,
      servings_unit: "loaves",
    });
    expect(await screen.findByText(RECIPE_DETAIL_TEXT)).toBeTruthy();
    expect(navigation.getPathname()).toBe(`/recipes/${recipe.id}`);
  });

  it("stays on recipe creation when saving fails", async () => {
    const NETWORK_ERROR_MESSAGE = "Network failure";
    const user = makeUserResponse();
    const error = new Error(NETWORK_ERROR_MESSAGE);
    const saveErrorMessage = "Unable to save recipe. Please try again.";

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(recipeService, "saveRecipe").mockRejectedValue(error);

    const { navigation } = await renderRouteNavigation(CREATE_RECIPE_PATH, {
      createRecipe: NewRecipeScreen,
    });

    await fireEvent.changeText(await screen.findByLabelText(RECIPE_TITLE_LABEL), RECIPE_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_TEXT }));

    await screen.findByText(saveErrorMessage);

    expect(navigation.getPathname()).toBe(CREATE_RECIPE_PATH);
  });
});

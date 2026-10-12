import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ReactElement } from "react";
import { Text } from "react-native";

import { makeRecipeSummary } from "@/test/fixtures/recipes";
import { makeUserResponse } from "@/test/fixtures/users";
import * as recipeService from "@/recipes/recipe-service";

import RootLayout from "../../../app/_layout";
import RecipeLibraryScreen from "../../../app/index";
import RecipeDetailRoute from "../../../app/recipes/[id]";
import * as auth from "../../api/auth";
import * as session from "../session";
import { LoginScreen } from "../login-screen";
import { RegisterScreen } from "../register-screen";

const CREATE_ACCOUNT_TEXT = "Create account";
const EMAIL = "test@example.com";
const INDEX_PATH = "/";
const FAVORITE_TEXT = "Favorite";
const LIBRARY_TEXT = "Library route";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const LOGIN_PATH = "/login";
const LOGIN_TEXT = "Login route";
const PASSWORD = "testPassword1";
const RECIPE_DETAIL_PATH = "/recipes/recipe-1";
const RECIPE_DETAIL_TEXT = "Recipe detail route";
const RECIPE_ID = "recipe-1";
const REGISTER_PATH = "/register";
const REGISTER_TEXT = "Registration route";
const SIGN_IN_TEXT = "Sign in";

type RouteOptions = {
  detail?: () => ReactElement | null;
  index?: () => ReactElement;
  login?: () => ReactElement;
  register?: () => ReactElement;
};

const renderRouteNavigation = async (
  initialUrl: string,
  {
    detail = () => <Text>{RECIPE_DETAIL_TEXT}</Text>,
    index = () => <Text>{LIBRARY_TEXT}</Text>,
    login = () => <Text>{LOGIN_TEXT}</Text>,
    register = () => <Text>{REGISTER_TEXT}</Text>,
  }: RouteOptions = {},
) => {
  await renderRouter(
    {
      _layout: RootLayout,
      index,
      login,
      register,
      "recipes/[id]": detail,
    },
    { initialUrl },
  );
};

describe("AppNavigator", () => {
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

  it("preserves the submitted search and favorite filter when returning to the library", async () => {
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
    });
    const searchRecipesText = "Search recipes";
    const searchQuery = "chicken";
    const searchButtonText = "Search";
    const favoritesButtonTitle = "Favorites";

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
      });

    await renderRouteNavigation(INDEX_PATH, {
      index: RecipeLibraryScreen,
    });

    await fireEvent.press(screen.getByRole("button", { name: favoritesButtonTitle }));
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
      expect(recipesMock).toHaveBeenCalledTimes(4);
    });

    expect(recipesMock).toHaveBeenLastCalledWith({ query: searchQuery, favorite: true });
  });
});

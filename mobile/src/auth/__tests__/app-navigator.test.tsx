import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import type { ReactElement } from "react";
import { Text } from "react-native";

import type { UserResponse } from "@/types/auth";
import * as recipeService from "@/recipes/recipe-service";

import RootLayout from "../../../app/_layout";
import RecipeLibraryScreen from "../../../app/index";
import * as auth from "../../api/auth";
import { LoginScreen } from "../login-screen";
import { RegisterScreen } from "../register-screen";
import * as session from "../session";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "testPassword1";
const LIBRARY_TEXT = "Library route";
const LOGIN_TEXT = "Login route";
const REGISTER_TEXT = "Registration route";
const CREATE_ACCOUNT_TEXT = "Create account";
const SIGN_IN_TEXT = "Sign in";
const INDEX_PATH = "/";
const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const RECIPE_DETAIL_TEXT = "Recipe detail route";
const RECIPE_DETAIL_PATH = "/recipes/recipe-1";

const makeUserResponse = (): UserResponse => ({
  id: TEST_USER_ID,
  email: TEST_EMAIL,
});

type RouteOptions = {
  index?: () => ReactElement;
  login?: () => ReactElement;
  register?: () => ReactElement;
};

const renderRouteNavigation = async (
  initialUrl: string,
  {
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
      "recipes/[id]": () => <Text>{RECIPE_DETAIL_TEXT}</Text>,
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

    await fireEvent.changeText(await screen.findByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
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

    await fireEvent.changeText(await screen.findByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
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
    const recipe = {
      id: "recipe-1",
      title: "Tomato Soup",
      image_url: null,
      total_time_minutes: null,
      base_servings: null,
      is_favorite: false,
      tags: [],
    };

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
});

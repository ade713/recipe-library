import { renderRouter } from "expo-router/testing-library";
import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import RootLayout from "../../../app/_layout";
import * as session from "../session";
import type { UserResponse } from "@/types/auth";
import { LoginScreen } from "../login-screen";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "testPassword1";
const LIBRARY_TEXT = "Library route";
const LOGIN_TEXT = "Login route";

const makeUserResponse = (): UserResponse => ({
  id: TEST_USER_ID,
  email: TEST_EMAIL,
});

const renderRouteNavigation = async (initialUrl: string) => {
  await renderRouter(
    {
      _layout: RootLayout,
      index: () => <Text>{LIBRARY_TEXT}</Text>,
      login: () => <Text>{LOGIN_TEXT}</Text>,
    },
    { initialUrl },
  );
};

describe("AppNavigator", () => {
  afterEach(() => jest.useRealTimers());

  it("redirects signed-out users from the library to login", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);

    await renderRouteNavigation("/");

    expect(await screen.findByText(LOGIN_TEXT)).toBeTruthy();
    expect(screen.queryByText(LIBRARY_TEXT)).toBeNull();
  });

  it("redirects authenticated users from login to the library", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);

    await renderRouteNavigation("/login");

    expect(await screen.findByText(LIBRARY_TEXT)).toBeTruthy();
    expect(screen.queryByText(LOGIN_TEXT)).toBeNull();
  });

  it("opens the library after successful sign-in", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    jest.spyOn(session, "signIn").mockResolvedValue(user);

    await renderRouter(
      {
        _layout: RootLayout,
        index: () => <Text>{LIBRARY_TEXT}</Text>,
        login: LoginScreen,
      },
      { initialUrl: "/login" },
    );

    await fireEvent.changeText(await screen.findByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(LIBRARY_TEXT)).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeNull();
  });
});

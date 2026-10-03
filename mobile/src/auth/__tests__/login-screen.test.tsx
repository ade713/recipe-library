import { fireEvent, render, screen } from "@testing-library/react-native";

import { makeUserResponse } from "@/test/fixtures/users";

import { AuthProvider } from "../auth-provider";
import { LoginScreen } from "../login-screen";
import * as session from "../session";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "testPassword1";

const renderLoginScreen = async () => {
  await render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  );
};

describe("LoginScreen", () => {
  it("signs in through the provider with the entered credentials", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    const signInMock = jest.spyOn(session, "signIn").mockResolvedValue(user);

    await renderLoginScreen();

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(signInMock).toHaveBeenCalledWith({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(signInMock).toHaveBeenCalledTimes(1);
  });
});

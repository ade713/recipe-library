import { fireEvent, render, screen } from "@testing-library/react-native";
import * as auth from "@/api/auth";
import { RegisterScreen } from "../register-screen";
import type { RegisterRequest, UserResponse } from "@/types/auth";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "testPassword1";
const CREATE_ACCOUNT_LABEL = "Create account";
const ACCOUNT_CREATION_MESSAGE = "Account created. Please sign in.";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const CREATE_ACCOUNT_ERROR_MESSAGE = "Unable to create account. Please try again.";
const PASSWORD_LENGTH_MESSAGE = "Use at least 8 characters for your password.";

const makeUserResponse = (): UserResponse => ({
  id: TEST_USER_ID,
  email: TEST_EMAIL,
});

describe("RegisterScreen", () => {
  it.each([
    { label: "exactly eight characters", password: "password" },
    { label: "more than eight characters", password: TEST_PASSWORD },
  ])("registers with a password of $label", async ({ password }) => {
    const user = makeUserResponse();
    const payload: RegisterRequest = {
      email: TEST_EMAIL,
      password,
    };

    const registerMock = jest.spyOn(auth, "register").mockResolvedValue(user);

    await render(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), password);
    await fireEvent.press(screen.getByRole("button", { name: CREATE_ACCOUNT_LABEL }));

    expect(registerMock).toHaveBeenCalledWith(payload);
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(ACCOUNT_CREATION_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: CREATE_ACCOUNT_LABEL })).toBeNull();
  });

  it("does not show account-created feedback when registration fails", async () => {
    jest.spyOn(auth, "register").mockRejectedValue(new Error(NETWORK_ERROR_MESSAGE));

    await render(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: CREATE_ACCOUNT_LABEL }));

    expect(await screen.findByText(CREATE_ACCOUNT_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(ACCOUNT_CREATION_MESSAGE)).toBeNull();
    expect(screen.getByRole("button", { name: CREATE_ACCOUNT_LABEL })).toBeEnabled();
  });

  it("rejects passwords shorter than eight characters", async () => {
    const user = makeUserResponse();
    const shortPassword = "passwo7";

    const registerMock = jest.spyOn(auth, "register").mockResolvedValue(user);

    await render(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), shortPassword);
    await fireEvent.press(screen.getByRole("button", { name: CREATE_ACCOUNT_LABEL }));

    expect(await screen.findByText(PASSWORD_LENGTH_MESSAGE)).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });
});

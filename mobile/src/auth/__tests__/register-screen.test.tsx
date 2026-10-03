import { fireEvent, render, screen } from "@testing-library/react-native";

import { makeUserResponse } from "@/test/fixtures/users";
import type { RegisterRequest } from "@/types/auth";
import * as auth from "@/api/auth";

import { RegisterScreen } from "../register-screen";

const ACCOUNT_CREATION_MESSAGE = "Account created. Please sign in.";
const CREATE_ACCOUNT_ERROR_MESSAGE = "Unable to create account. Please try again.";
const CREATE_ACCOUNT_LABEL = "Create account";
const EMAIL = "test@example.com";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const PASSWORD = "testPassword1";
const PASSWORD_LENGTH_MESSAGE = "Use at least 8 characters for your password.";

describe("RegisterScreen", () => {
  it.each([
    { label: "exactly eight characters", password: "password" },
    { label: "more than eight characters", password: PASSWORD },
  ])("registers with a password of $label", async ({ password }) => {
    const user = makeUserResponse();
    const payload: RegisterRequest = {
      email: EMAIL,
      password,
    };

    const registerMock = jest.spyOn(auth, "register").mockResolvedValue(user);

    await render(<RegisterScreen />);

    await fireEvent.changeText(screen.getByLabelText("Email"), EMAIL);
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

    await fireEvent.changeText(screen.getByLabelText("Email"), EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), PASSWORD);
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

    await fireEvent.changeText(screen.getByLabelText("Email"), EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), shortPassword);
    await fireEvent.press(screen.getByRole("button", { name: CREATE_ACCOUNT_LABEL }));

    expect(await screen.findByText(PASSWORD_LENGTH_MESSAGE)).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });
});

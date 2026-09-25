import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AuthForm, type AuthFormValues } from "../auth-form";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "testPassword1";
const NETWORK_ERROR_MESSAGE = "Network failure";
const SIGN_IN_ERROR_MESSAGE = "Unable to sign in. Please try again.";
const CREATE_ACCOUNT_ERROR_MESSAGE = "Unable to create account.";
const SHORT_PASSWORD_MESSAGE = "Password is too short.";
const SIGN_IN_LABEL = "Sign in";

type FormOptions = {
  submitLabel?: string;
  submitErrorMessage?: string;
  validate?: (values: AuthFormValues) => string | null;
};

const renderAuthForm = async (
  onSubmit: (payload: AuthFormValues) => Promise<void>,
  { submitLabel = SIGN_IN_LABEL, submitErrorMessage = SIGN_IN_ERROR_MESSAGE, validate }: FormOptions = {},
) => {
  await render(
    <AuthForm
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      submitErrorMessage={submitErrorMessage}
      validate={validate}
    />,
  );
};

describe("AuthForm", () => {
  it("renders email and password inputs and a sign-in button", async () => {
    await renderAuthForm(jest.fn());

    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.getByRole("button", { name: SIGN_IN_LABEL })).toBeTruthy();
  });

  it("submits the entered email and password", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderAuthForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    const signInButton = screen.getByRole("button", { name: SIGN_IN_LABEL });
    await fireEvent.press(signInButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(signInButton).toBeEnabled();
  });

  it("disables sign-in while submission is pending", async () => {
    const onSubmit = jest.fn(() => new Promise<void>(() => {}));

    await renderAuthForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);

    const signInButton = screen.getByRole("button", { name: SIGN_IN_LABEL });
    void fireEvent.press(signInButton);

    await waitFor(() => {
      expect(signInButton).toBeDisabled();
    });

    await fireEvent.press(signInButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows a safe error and enables retry when submission fails", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    const onSubmit = jest.fn().mockRejectedValue(error);

    await renderAuthForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    const signInButton = screen.getByRole("button", { name: SIGN_IN_LABEL });
    await fireEvent.press(signInButton);

    expect(await screen.findByText(SIGN_IN_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(NETWORK_ERROR_MESSAGE)).toBeNull();
    expect(signInButton).toBeEnabled();
  });

  it("clears the previous error when retrying submission", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    const onSubmit = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockImplementation(() => new Promise<void>(() => {}));

    await renderAuthForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    const signInButton = screen.getByRole("button", { name: SIGN_IN_LABEL });
    await fireEvent.press(signInButton);

    expect(await screen.findByText(SIGN_IN_ERROR_MESSAGE)).toBeTruthy();
    void fireEvent.press(signInButton);

    await waitFor(() => {
      expect(screen.queryByText(SIGN_IN_ERROR_MESSAGE)).toBeNull();
      expect(signInButton).toBeDisabled();
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it.each([
    { label: "empty email", email: "", password: TEST_PASSWORD },
    { label: "whitespace-only email", email: "   ", password: TEST_PASSWORD },
    { label: "empty password", email: TEST_EMAIL, password: "" },
  ])("does not submit with $label", async ({ email, password }) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderAuthForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText("Email"), email);
    await fireEvent.changeText(screen.getByLabelText("Password"), password);
    await fireEvent.press(screen.getByRole("button", { name: SIGN_IN_LABEL }));

    expect(await screen.findByText("Enter your email and password.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("preserves password whitespace when submitting", async () => {
    const password = "  testPassword1  ";
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderAuthForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), password);
    await fireEvent.press(screen.getByRole("button", { name: SIGN_IN_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({ email: TEST_EMAIL, password });
  });

  it("uses the supplied submit label", async () => {
    const suppliedSubmitLabel = "Create account";
    await renderAuthForm(jest.fn(), { submitLabel: suppliedSubmitLabel });

    expect(screen.getByRole("button", { name: suppliedSubmitLabel })).toBeTruthy();
  });

  it("shows the supplied message when submission fails", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);
    const onSubmit = jest.fn().mockRejectedValue(error);

    await renderAuthForm(onSubmit, { submitErrorMessage: CREATE_ACCOUNT_ERROR_MESSAGE });

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: SIGN_IN_LABEL }));

    expect(await screen.findByText(CREATE_ACCOUNT_ERROR_MESSAGE)).toBeTruthy();
  });

  it("shows custom validation feedback without submitting", async () => {
    const validate = jest.fn().mockReturnValue(SHORT_PASSWORD_MESSAGE);
    const onSubmit = jest.fn();

    await renderAuthForm(onSubmit, { validate });

    await fireEvent.changeText(screen.getByLabelText("Email"), TEST_EMAIL);
    await fireEvent.changeText(screen.getByLabelText("Password"), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole("button", { name: SIGN_IN_LABEL }));

    expect(await screen.findByText(SHORT_PASSWORD_MESSAGE)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

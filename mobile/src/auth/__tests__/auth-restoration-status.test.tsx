import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthRestorationStatus } from "../auth-restoration-status";
import type { AuthState } from "../auth-state";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const ERROR_MESSAGE = "Unable to restore session. Please retry.";

const settledStates: AuthState[] = [
  { status: "signedOut" },
  {
    status: "authenticated",
    user: { id: TEST_USER_ID, email: TEST_EMAIL },
  },
];

const renderAuthRestorationStatus = async ({ state, onRetry }: { state: AuthState; onRetry: () => void }) => {
  await render(<AuthRestorationStatus state={state} onRetry={onRetry} />);
};

describe("AuthRestorationStatus", () => {
  it("shows progress while restoring the session", async () => {
    await renderAuthRestorationStatus({ state: { status: "loading" }, onRetry: jest.fn() });

    expect(screen.getByLabelText("Restoring session")).toBeTruthy();
    expect(screen.getByText("Restoring session...")).toBeTruthy();
  });

  it("shows the error message and retries when pressed", async () => {
    const onRetry = jest.fn();
    await renderAuthRestorationStatus({
      state: {
        status: "error",
        message: ERROR_MESSAGE,
      },
      onRetry,
    });

    expect(screen.getByText(ERROR_MESSAGE)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each(settledStates)("renders nothing when $status", async (state) => {
    await renderAuthRestorationStatus({ state, onRetry: jest.fn() });

    expect(screen.toJSON()).toBeNull();
  });
});

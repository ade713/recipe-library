import { fireEvent, render, screen } from "@testing-library/react-native";
import { AuthRestorationGate } from "../auth-restoration-gate";
import { Text } from "react-native";
import * as session from "../session";
import { AuthProvider } from "../auth-provider";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const APP_CONTENT = "App content";
const RESTORING_MESSAGE = "Restoring session...";

const renderAuthRestorationGate = async () => {
  await render(
    <AuthProvider>
      <AuthRestorationGate>
        <Text>{APP_CONTENT}</Text>
      </AuthRestorationGate>
    </AuthProvider>,
  );
};

describe("AuthRestorationGate", () => {
  it("shows restoration progress and hides app content while loading", async () => {
    jest.spyOn(session, "restoreSession").mockImplementation(() => new Promise(() => {}));

    await renderAuthRestorationGate();

    expect(screen.getByText(RESTORING_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(APP_CONTENT)).toBeNull();
  });

  it("shows app content after retrying a failed restoration", async () => {
    const error = new Error("Secure storage unavailable");
    const expectedMessage = "Unable to restore session. Please retry.";

    const restoreMock = jest.spyOn(session, "restoreSession").mockRejectedValueOnce(error).mockResolvedValueOnce(null);

    await renderAuthRestorationGate();

    expect(await screen.findByText(expectedMessage)).toBeTruthy();
    expect(screen.queryByText(APP_CONTENT)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    expect(screen.queryByText(expectedMessage)).toBeNull();
    expect(restoreMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { label: "signedOut", user: null },
    {
      label: "authenticated",
      user: { id: TEST_USER_ID, email: TEST_EMAIL },
    },
  ])("shows app content when restoration completes as $label", async ({ user }) => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(user);

    await renderAuthRestorationGate();

    expect(await screen.findByText(APP_CONTENT)).toBeTruthy();
    expect(screen.queryByText(RESTORING_MESSAGE)).toBeNull();
  });
});

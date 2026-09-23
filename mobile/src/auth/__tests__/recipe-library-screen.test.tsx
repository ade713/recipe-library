import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import RecipeLibraryScreen from "../../../app/index";
import { AuthProvider } from "../auth-provider";
import * as session from "../session";
import type { UserResponse } from "@/types/auth";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const SIGN_OUT_ERROR_MESSAGE = "Unable to sign out. Please try again.";

const makeUserResponse = (): UserResponse => ({
  id: TEST_USER_ID,
  email: TEST_EMAIL,
});

const renderRecipeLibraryScreen = async () => {
  await render(
    <AuthProvider>
      <RecipeLibraryScreen />
    </AuthProvider>,
  );
};

describe("RecipeLibraryScreen", () => {
  it("shows safe feedback and allows retry when sign-out fails", async () => {
    const user = makeUserResponse();
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    jest.spyOn(session, "signOut").mockRejectedValue(error);

    await renderRecipeLibraryScreen();

    const signOutButton = await screen.findByRole("button", { name: "Sign out" });
    await fireEvent.press(signOutButton);

    expect(await screen.findByText(SIGN_OUT_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(STORAGE_ERROR_MESSAGE)).toBeNull();
    expect(signOutButton).toBeEnabled();
  });

  it("prevents another sign-out while removal is pending", async () => {
    const user = makeUserResponse();

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);
    const signOutMock = jest.spyOn(session, "signOut").mockImplementation(() => new Promise(() => {}));

    await renderRecipeLibraryScreen();

    const signOutButton = screen.getByRole("button", { name: "Sign out" });
    void fireEvent.press(signOutButton);

    await waitFor(() => {
      expect(signOutButton).toBeDisabled();
    });

    await fireEvent.press(signOutButton);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});

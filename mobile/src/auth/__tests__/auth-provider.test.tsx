import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useAuth } from "../auth-provider";
import * as session from "../session";

const AuthStatus = () => {
  const state = useAuth();

  return (
    <>
      <Text>{state.status}</Text>
      {state.status === "error" && <Text>{state.message}</Text>}
      {state.status === "authenticated" && <Text>{state.user.email}</Text>}
    </>
  );
};

const renderAuthStatus = async () => {
  await render(
    <AuthProvider>
      <AuthStatus />
    </AuthProvider>,
  );
};

describe("AuthProvider", () => {
  it("provides the initial loading state", async () => {
    jest.spyOn(session, "restoreSession").mockImplementation(() => new Promise(() => {}));

    await renderAuthStatus();

    expect(screen.getByText("loading")).toBeTruthy();
  });

  it("shows signed-out state when restoration finds no session", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);

    await renderAuthStatus();

    expect(await screen.findByText("signedOut")).toBeTruthy();
  });

  it("exposes the restored user to consumers", async () => {
    const user = {
      id: "test-user-id",
      email: "test@example.com",
    };

    jest.spyOn(session, "restoreSession").mockResolvedValue(user);

    await renderAuthStatus();

    expect(await screen.findByText("authenticated")).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
  });

  it("shows a safe error message when restoration fails", async () => {
    const error = new Error("Internal storage details");

    jest.spyOn(session, "restoreSession").mockRejectedValue(error);

    await renderAuthStatus();

    expect(await screen.findByText("error")).toBeTruthy();
    expect(screen.getByText("Unable to restore session. Please retry.")).toBeTruthy();
    expect(screen.queryByText("Internal storage details")).toBeNull();
  });

  it("rejects consumers rendered outside AuthProvider", async () => {
    await expect(render(<AuthStatus />)).rejects.toThrow("useAuth must be used within AuthProvider");
  });
});

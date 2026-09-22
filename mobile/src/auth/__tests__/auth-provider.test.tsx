import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react-native";
import { Button, Text } from "react-native";
import { AuthProvider, useAuth } from "../auth-provider";
import * as session from "../session";
import type { LoginRequest, UserResponse } from "@/types/auth";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "testPassword1";
const TEST_LOGIN_PAYLOAD: LoginRequest = {
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
};
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const SESSION_ERROR_MESSAGE = "Unable to restore session. Please retry.";

const AuthStatus = () => {
  const { state, retryRestoration, signIn } = useAuth();

  return (
    <>
      <Text>{state.status}</Text>
      {state.status === "error" && <Text>{state.message}</Text>}
      {state.status === "error" && <Button title='Retry' onPress={retryRestoration} />}
      {state.status === "authenticated" && <Text>{state.user.email}</Text>}
      {state.status === "signedOut" && <Button title='Sign in' onPress={() => signIn(TEST_LOGIN_PAYLOAD)} />}
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
      id: TEST_USER_ID,
      email: TEST_EMAIL,
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
    expect(screen.getByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText("Internal storage details")).toBeNull();
  });

  it("rejects consumers rendered outside AuthProvider", async () => {
    await expect(render(<AuthStatus />)).rejects.toThrow("useAuth must be used within AuthProvider");
  });

  it("retries restoration after a failure", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    const restoreMock = jest.spyOn(session, "restoreSession").mockRejectedValueOnce(error).mockResolvedValueOnce(null);

    await renderAuthStatus();

    await fireEvent.press(await screen.findByText("Retry"));
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(restoreMock).toHaveBeenCalledTimes(2);
  });

  it("shows loading and clears the error while retry is pending", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    const restoreMock = jest
      .spyOn(session, "restoreSession")
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(() => new Promise(() => {}));

    await renderAuthStatus();

    await fireEvent.press(await screen.findByText("Retry"));

    expect(await screen.findByText("loading")).toBeTruthy();
    expect(screen.queryByText(SESSION_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText("Retry")).toBeNull();
    expect(restoreMock).toHaveBeenCalledTimes(2);
  });

  it("shows the safe error and allows another attempt when retry fails", async () => {
    const error1 = new Error(NETWORK_ERROR_MESSAGE);
    const error2 = new Error("Network unavailable after retry");

    const restoreMock = jest
      .spyOn(session, "restoreSession")
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2);

    await renderAuthStatus();

    await fireEvent.press(await screen.findByText("Retry"));

    expect(await screen.findByText(SESSION_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(restoreMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(error1.message)).toBeNull();
    expect(screen.queryByText(error2.message)).toBeNull();
  });

  it("exposes the authenticated user after sign-in succeeds", async () => {
    const user: UserResponse = {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
    };

    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    const signInMock = jest.spyOn(session, "signIn").mockResolvedValue(user);

    await renderAuthStatus();

    await fireEvent.press(await screen.findByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("authenticated")).toBeTruthy();
    expect(screen.getByText(user.email)).toBeTruthy();
    expect(signInMock).toHaveBeenCalledWith(TEST_LOGIN_PAYLOAD);
  });

  it("preserves signed-out state and propagates sign-in failures", async () => {
    const error = new Error("Invalid email or password");

    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    jest.spyOn(session, "signIn").mockRejectedValue(error);

    const { result } = await renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("signedOut");
    });

    await expect(result.current.signIn(TEST_LOGIN_PAYLOAD)).rejects.toBe(error);
    expect(result.current.state).toEqual({ status: "signedOut" });
  });

  it("keeps signed-out state while sign-in is pending", async () => {
    jest.spyOn(session, "restoreSession").mockResolvedValue(null);
    const signInMock = jest.spyOn(session, "signIn").mockImplementation(() => new Promise(() => {}));

    const { result } = await renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("signedOut");
    });

    void result.current.signIn(TEST_LOGIN_PAYLOAD);

    expect(signInMock).toHaveBeenCalledWith(TEST_LOGIN_PAYLOAD);
    expect(result.current.state.status).toBe("signedOut");
  });
});

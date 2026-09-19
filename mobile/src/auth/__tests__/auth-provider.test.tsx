import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button, Text } from "react-native";
import { AuthProvider, useAuth } from "../auth-provider";
import * as session from "../session";

const AuthStatus = () => {
  const { state, retryRestoration } = useAuth();

  return (
    <>
      <Text>{state.status}</Text>
      {state.status === "error" && <Text>{state.message}</Text>}
      {state.status === "error" && <Button title='Retry' onPress={retryRestoration} />}
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

  it("retries restoration after a failure", async () => {
    const error = new Error("Network unavailable");

    const restoreMock = jest.spyOn(session, "restoreSession").mockRejectedValueOnce(error).mockResolvedValueOnce(null);

    await renderAuthStatus();

    await fireEvent.press(await screen.findByText("Retry"));
    expect(await screen.findByText("signedOut")).toBeTruthy();
    expect(restoreMock).toHaveBeenCalledTimes(2);
  });

  it("shows loading and clears the error while retry is pending", async () => {
    const error = new Error("Network unavailable");

    const restoreMock = jest
      .spyOn(session, "restoreSession")
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(() => new Promise(() => {}));

    await renderAuthStatus();

    await fireEvent.press(await screen.findByText("Retry"));

    expect(await screen.findByText("loading")).toBeTruthy();
    expect(screen.queryByText("Unable to restore session. Please retry.")).toBeNull();
    expect(screen.queryByText("Retry")).toBeNull();
    expect(restoreMock).toHaveBeenCalledTimes(2);
  });

  it("shows the safe error and allows another attempt when retry fails", async () => {
    const error1 = new Error("Network unavailable");
    const error2 = new Error("Network unavailable after retry");

    const restoreMock = jest
      .spyOn(session, "restoreSession")
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2);

    await renderAuthStatus();

    await fireEvent.press(await screen.findByText("Retry"));

    expect(await screen.findByText("Unable to restore session. Please retry.")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
    expect(restoreMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(error1.message)).toBeNull();
    expect(screen.queryByText(error2.message)).toBeNull();
  });
});

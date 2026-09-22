import type { UserResponse } from "../../types/auth";
import { authReducer } from "../auth-state";

const TEST_USER_ID = "test-user-id";
const TEST_EMAIL = "test@example.com";

describe("authReducer", () => {
  it("clears the previous error when restoration starts", () => {
    const result = authReducer({ status: "error", message: "Unable to restore session" }, { type: "restoreStarted" });

    expect(result).toEqual({ status: "loading" });
  });

  it("sets authenticated state when restoration returns a user", () => {
    const user: UserResponse = {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
    };
    const result = authReducer({ status: "loading" }, { type: "restoreSucceeded", user });

    expect(result).toEqual({ status: "authenticated", user });
  });

  it("sets signed-out state when restoration returns null", () => {
    const result = authReducer({ status: "loading" }, { type: "restoreSucceeded", user: null });

    expect(result).toEqual({ status: "signedOut" });
  });

  it("sets an error state when restoration has a failure", () => {
    const result = authReducer(
      { status: "loading" },
      { type: "restoreFailed", message: "Connection unavailable. Please retry." },
    );

    expect(result).toEqual({ status: "error", message: "Connection unavailable. Please retry." });
  });

  it("sets authenticated state when sign-in succeeds", () => {
    const user: UserResponse = {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
    };
    const result = authReducer({ status: "signedOut" }, { type: "signInSucceeded", user });

    expect(result).toEqual({ status: "authenticated", user });
  });
});

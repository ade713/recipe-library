import type { UserResponse } from "../../types/auth";
import { authReducer } from "../auth-state";

describe("authReducer", () => {
  it("clears the previous error when restoration starts", () => {
    const result = authReducer({ status: "error", message: "Unable to restore session" }, { type: "restoreStarted" });

    expect(result).toEqual({ status: "loading" });
  });

  it("sets authenticated state when restoration returns a user", () => {
    const user: UserResponse = {
      id: "test-user-id",
      email: "test@example.com",
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
});

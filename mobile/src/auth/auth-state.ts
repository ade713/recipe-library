import type { UserResponse } from "../types/auth";

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "authenticated"; user: UserResponse }
  | { status: "error"; message: string };

export type AuthAction =
  | { type: "restoreStarted" }
  | { type: "restoreSucceeded"; user: UserResponse | null }
  | { type: "restoreFailed"; message: string };

/** Return the next authentication state for an action. */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  if (action.type === "restoreStarted") {
    return { status: "loading" };
  }

  if (action.type === "restoreSucceeded") {
    if (action.user === null) {
      return { status: "signedOut" };
    }

    return { status: "authenticated", user: action.user };
  }

  if (action.type === "restoreFailed") {
    return {
      status: "error",
      message: action.message,
    };
  }

  return state;
}

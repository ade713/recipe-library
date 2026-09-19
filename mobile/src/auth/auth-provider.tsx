import { createContext, useContext, useEffect, useReducer } from "react";
import type { PropsWithChildren } from "react";
import { authReducer } from "./auth-state";
import type { AuthState } from "./auth-state";
import { restoreSession } from "./session";

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Share authentication state with child components. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, authDispatch] = useReducer(authReducer, { status: "loading" });

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const user = await restoreSession();

        if (active) {
          authDispatch({ type: "restoreSucceeded", user });
        }
      } catch {
        if (active) {
          authDispatch({
            type: "restoreFailed",
            message: "Unable to restore session. Please retry.",
          });
        }
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

/** Read authentication state from the surrounding provider. */
export function useAuth(): AuthState {
  const state = useContext(AuthContext);

  if (state === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return state;
}

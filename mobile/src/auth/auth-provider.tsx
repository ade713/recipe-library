import { createContext, useContext, useEffect, useReducer, useState } from "react";
import type { PropsWithChildren } from "react";
import { authReducer } from "./auth-state";
import type { AuthState } from "./auth-state";
import { restoreSession } from "./session";

type AuthContextValue = {
  state: AuthState;
  retryRestoration: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Share authentication state with child components. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, authDispatch] = useReducer(authReducer, { status: "loading" });
  const [restorationAttempt, setRestorationAttempt] = useState(0);

  const retryRestoration = (): void => {
    authDispatch({ type: "restoreStarted" });
    setRestorationAttempt((attempt) => attempt + 1);
  };

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
  }, [restorationAttempt]);

  return <AuthContext.Provider value={{ state: authState, retryRestoration }}>{children}</AuthContext.Provider>;
}

/** Read authentication state from the surrounding provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

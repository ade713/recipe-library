import { createContext, useContext, useEffect, useReducer, useState } from "react";
import type { PropsWithChildren } from "react";
import type { LoginRequest } from "@/types/auth";
import { authReducer } from "./auth-state";
import { restoreSession, signIn as signInSession } from "./session";
import type { AuthState } from "./auth-state";

type AuthContextValue = {
  signIn: (payload: LoginRequest) => Promise<void>;
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

  const signIn = async (payload: LoginRequest): Promise<void> => {
    const user = await signInSession(payload);
    authDispatch({
      type: "signInSucceeded",
      user,
    });
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

  return <AuthContext.Provider value={{ state: authState, retryRestoration, signIn }}>{children}</AuthContext.Provider>;
}

/** Read authentication state from the surrounding provider. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

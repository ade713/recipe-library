import type { PropsWithChildren } from "react";
import { useAuth } from "./auth-provider";
import { AuthRestorationStatus } from "./auth-restoration-status";

/** Hold app content until session restoration settles. */
export function AuthRestorationGate({ children }: PropsWithChildren) {
  const { state, retryRestoration } = useAuth();

  if (state.status === "loading" || state.status === "error") {
    return <AuthRestorationStatus state={state} onRetry={retryRestoration} />;
  }

  return children;
}

import { getCurrentUser, login } from "../api/auth";
import type { LoginRequest, UserResponse } from "../types/auth";
import { removeAccessToken, saveAccessToken } from "./token-storage";

/** Authenticate, load the user, and persist the token before returning. */
export async function signIn(payload: LoginRequest): Promise<UserResponse> {
  const tokenResponse = await login(payload);
  const currentUser = await getCurrentUser(tokenResponse.access_token);
  await saveAccessToken(tokenResponse.access_token);

  return currentUser;
}

/** Remove the local access token without revoking it on the backend. */
export async function signOut(): Promise<void> {
  await removeAccessToken();
}

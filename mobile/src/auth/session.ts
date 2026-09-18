import { ApiError } from "../api/errors";
import { getCurrentUser, login } from "../api/auth";
import type { LoginRequest, UserResponse } from "../types/auth";
import { getAccessToken, removeAccessToken, saveAccessToken } from "./token-storage";

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

/** Restore the user from a saved token, or return null when signed out. */
export async function restoreSession(): Promise<UserResponse | null> {
  const token = await getAccessToken();
  if (token === null) {
    return null;
  }

  try {
    return await getCurrentUser(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await removeAccessToken();
      return null;
    }

    throw error;
  }
}

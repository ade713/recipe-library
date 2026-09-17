import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "recipe-library.access-token";

/** Persist the access token in secure device storage. */
export async function saveAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

/** Read the stored access token, or null when none exists. */
export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

/** Remove the access token from secure device storage. */
export async function removeAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

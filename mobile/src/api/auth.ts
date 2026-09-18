import { apiFetch } from "./client";
import type { LoginRequest, TokenResponse, UserResponse } from "../types/auth";

/** Exchange login credentials for an access token without storing it. */
export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const result = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (result === undefined) {
    throw new Error("Expected a token response");
  }

  return result;
}

/** Fetch the current user's profile using the supplied access token. */
export async function getCurrentUser(token: string): Promise<UserResponse> {
  const result = await apiFetch<UserResponse>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result === undefined) {
    throw new Error("Expected a user response");
  }

  return result;
}

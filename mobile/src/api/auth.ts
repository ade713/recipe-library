import { apiFetch } from "./client";
import type { LoginRequest, TokenResponse } from "../types/auth";

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

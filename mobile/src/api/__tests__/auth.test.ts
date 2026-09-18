import { getCurrentUser, login } from "../auth";
import * as client from "../client";
import type { LoginRequest, TokenResponse, UserResponse } from "../../types/auth";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test-password";
const TEST_ACCESS_TOKEN = "test-access-token";
const TOKEN_TYPE = "bearer";
const LOGIN_PATH = "/auth/login";
const GET_CURRENT_USER_PATH = "/auth/me";
const CURRENT_USER_ID = "current-user-uuid";

const makeLoginPayload = (): LoginRequest => ({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});

describe("login", () => {
  it("posts credentials and returns the token response", async () => {
    const payload = makeLoginPayload();
    const tokenResponse: TokenResponse = {
      access_token: TEST_ACCESS_TOKEN,
      token_type: TOKEN_TYPE,
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(tokenResponse);

    const response = await login(payload);

    expect(response).toBe(tokenResponse);
    expect(requestMock).toHaveBeenCalledWith(LOGIN_PATH, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("rejects an empty token response", async () => {
    const payload = makeLoginPayload();

    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(login(payload)).rejects.toThrow("Expected a token response");
  });

  it("propagates API client failures", async () => {
    const payload = makeLoginPayload();
    const error = new Error("API request failed: 401");

    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(login(payload)).rejects.toBe(error);
  });
});

describe("getCurrentUser", () => {
  it("returns the current user using the supplied access token", async () => {
    const userResponse: UserResponse = {
      id: CURRENT_USER_ID,
      email: TEST_EMAIL,
    };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(userResponse);

    const response = await getCurrentUser(TEST_ACCESS_TOKEN);

    expect(response).toBe(userResponse);
    expect(requestMock).toHaveBeenCalledWith(GET_CURRENT_USER_PATH, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TEST_ACCESS_TOKEN}`,
      },
    });
  });

  it("rejects an empty user response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(getCurrentUser(TEST_ACCESS_TOKEN)).rejects.toThrow("Expected a user response");
  });

  it("propagates API client failures", async () => {
    const error = new Error("API request failed: 401");

    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(getCurrentUser(TEST_ACCESS_TOKEN)).rejects.toBe(error);
  });
});

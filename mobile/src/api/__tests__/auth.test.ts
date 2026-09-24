import { getCurrentUser, login, register } from "../auth";
import * as client from "../client";
import type { LoginRequest, RegisterRequest, TokenResponse, UserResponse } from "../../types/auth";
import { ApiError } from "../errors";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test-password";
const TEST_ACCESS_TOKEN = "test-access-token";
const TOKEN_TYPE = "bearer";
const LOGIN_PATH = "/auth/login";
const REGISTER_PATH = "/auth/register";
const GET_CURRENT_USER_PATH = "/auth/me";
const CURRENT_USER_ID = "current-user-uuid";
const TOKEN_ERROR_MESSAGE = "Expected a token response";
const USER_ERROR_MESSAGE = "Expected a user response";
const NETWORK_ERROR_MESSAGE = "Network unavailable";

const makeLoginPayload = (): LoginRequest => ({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});

const makeRegisterPayload = (): RegisterRequest => ({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});

const makeUserResponse = (): UserResponse => ({
  id: CURRENT_USER_ID,
  email: TEST_EMAIL,
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

    await expect(login(payload)).rejects.toThrow(TOKEN_ERROR_MESSAGE);
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
    const userResponse = makeUserResponse();

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

    await expect(getCurrentUser(TEST_ACCESS_TOKEN)).rejects.toThrow(USER_ERROR_MESSAGE);
  });

  it("propagates API client failures", async () => {
    const error = new Error("API request failed: 401");

    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(getCurrentUser(TEST_ACCESS_TOKEN)).rejects.toBe(error);
  });
});

describe("register", () => {
  it("registers with JSON credentials and returns the created user", async () => {
    const userResponse = makeUserResponse();
    const payload = makeRegisterPayload();

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(userResponse);

    const response = await register(payload);

    expect(requestMock).toHaveBeenCalledWith(REGISTER_PATH, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    expect(response).toBe(userResponse);
  });

  it("rejects an empty registration response", async () => {
    const payload = makeRegisterPayload();

    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(register(payload)).rejects.toThrow(USER_ERROR_MESSAGE);
  });

  it.each([
    { label: "duplicate account", error: new ApiError(409) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates registration failures: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(register(makeRegisterPayload())).rejects.toBe(error);
  });
});

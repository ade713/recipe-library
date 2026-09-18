import * as authApi from "../../api/auth";
import * as tokenStorage from "../token-storage";
import { signIn } from "../session";
import type { LoginRequest, TokenResponse, UserResponse } from "../../types/auth";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test-password";
const TEST_ACCESS_TOKEN = "test-access-token";
const TOKEN_TYPE = "bearer";
const CURRENT_USER_ID = "current-user-uuid";

const makeLoginPayload = (): LoginRequest => ({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});
const makeTokenResponse = (): TokenResponse => ({
  access_token: TEST_ACCESS_TOKEN,
  token_type: TOKEN_TYPE,
});
const makeCurrentUser = (): UserResponse => ({
  id: CURRENT_USER_ID,
  email: TEST_EMAIL,
});

describe("signIn", () => {
  it("authenticates, stores the token, and returns the user", async () => {
    const payload = makeLoginPayload();
    const tokenResponse = makeTokenResponse();
    const currentUser = makeCurrentUser();

    const loginMock = jest.spyOn(authApi, "login").mockResolvedValue(tokenResponse);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockResolvedValue(currentUser);
    const saveMock = jest.spyOn(tokenStorage, "saveAccessToken").mockResolvedValue(undefined);

    const response = await signIn(payload);

    expect(response).toBe(currentUser);
    expect(loginMock).toHaveBeenCalledWith(payload);
    expect(userMock).toHaveBeenCalledWith(tokenResponse.access_token);
    expect(saveMock).toHaveBeenCalledWith(tokenResponse.access_token);
  });

  it("does not fetch the user or save a token when login fails", async () => {
    const payload = makeLoginPayload();
    const error = new Error("Incorrect email or password");

    jest.spyOn(authApi, "login").mockRejectedValue(error);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(new Error("Unexpected profile request"));
    const saveMock = jest.spyOn(tokenStorage, "saveAccessToken").mockResolvedValue(undefined);

    await expect(signIn(payload)).rejects.toBe(error);
    expect(userMock).not.toHaveBeenCalled();
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("does not save a token when fetching the user fails", async () => {
    const payload = makeLoginPayload();
    const tokenResponse = makeTokenResponse();
    const error = new Error("Current user is not authenticated");

    jest.spyOn(authApi, "login").mockResolvedValue(tokenResponse);
    jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(error);
    const saveMock = jest.spyOn(tokenStorage, "saveAccessToken").mockResolvedValue(undefined);

    await expect(signIn(payload)).rejects.toBe(error);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("rejects when saving the token fails", async () => {
    const payload = makeLoginPayload();
    const tokenResponse = makeTokenResponse();
    const user = makeCurrentUser();
    const error = new Error("Secure storage unavailable");

    jest.spyOn(authApi, "login").mockResolvedValue(tokenResponse);
    jest.spyOn(authApi, "getCurrentUser").mockResolvedValue(user);
    jest.spyOn(tokenStorage, "saveAccessToken").mockRejectedValue(error);

    await expect(signIn(payload)).rejects.toBe(error);
  });
});

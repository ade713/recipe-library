import * as authApi from "../../api/auth";
import * as tokenStorage from "../token-storage";
import { restoreSession, signIn, signOut } from "../session";
import type { LoginRequest, TokenResponse, UserResponse } from "../../types/auth";
import { ApiError } from "@/api/errors";

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

describe("signOut", () => {
  it("remove the locally stored token", async () => {
    const removeMock = jest.spyOn(tokenStorage, "removeAccessToken").mockResolvedValue(undefined);

    await signOut();

    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it("propagates token-removal failures", async () => {
    const error = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "removeAccessToken").mockRejectedValue(error);

    await expect(signOut()).rejects.toBe(error);
  });
});

describe("restoreSession", () => {
  it("returns null without fetching a user when no token is stored", async () => {
    const getMock = jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(new Error("Unexpected profile request"));

    await expect(restoreSession()).resolves.toBe(null);
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(userMock).not.toHaveBeenCalled();
  });

  it("returns the user associated with the stored token", async () => {
    const profile = makeCurrentUser();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(TEST_ACCESS_TOKEN);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockResolvedValue(profile);

    await expect(restoreSession()).resolves.toBe(profile);
    expect(userMock).toHaveBeenCalledWith(TEST_ACCESS_TOKEN);
  });

  it("removes the rejected token and returns null on HTTP 401", async () => {
    const error = new ApiError(401);

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(TEST_ACCESS_TOKEN);
    jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(error);
    const removeMock = jest.spyOn(tokenStorage, "removeAccessToken").mockResolvedValue(undefined);

    await expect(restoreSession()).resolves.toBe(null);
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["network failure", () => new TypeError("Network request failed")],
    ["server failure", () => new ApiError(500)],
  ] as const)("preserves the token on %s", async (_label, makeError) => {
    const error = makeError();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(TEST_ACCESS_TOKEN);
    jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(error);
    const removeMock = jest.spyOn(tokenStorage, "removeAccessToken").mockResolvedValue(undefined);

    await expect(restoreSession()).rejects.toBe(error);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("propagates storage read failures without fetching or removing", async () => {
    const error = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockResolvedValue(makeCurrentUser());
    const removeMock = jest.spyOn(tokenStorage, "removeAccessToken").mockResolvedValue(undefined);

    await expect(restoreSession()).rejects.toBe(error);
    expect(userMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("propagates cleanup failure when a rejected token cannot be removed", async () => {
    const storageError = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(TEST_ACCESS_TOKEN);
    jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(new ApiError(401));
    jest.spyOn(tokenStorage, "removeAccessToken").mockRejectedValue(storageError);

    await expect(restoreSession()).rejects.toBe(storageError);
  });
});

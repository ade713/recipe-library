import { ApiError } from "@/api/errors";
import { makeUserResponse } from "@/test/fixtures/users";

import { restoreSession, signIn, signOut } from "../session";
import type { LoginRequest, TokenResponse } from "../../types/auth";
import * as authApi from "../../api/auth";
import * as tokenStorage from "../token-storage";

const ACCESS_TOKEN = "test-access-token";
const EMAIL = "test@example.com";
const PASSWORD = "test-password";
const TOKEN_TYPE = "bearer";

const makeLoginPayload = (): LoginRequest => ({
  email: EMAIL,
  password: PASSWORD,
});
const makeTokenResponse = (): TokenResponse => ({
  access_token: ACCESS_TOKEN,
  token_type: TOKEN_TYPE,
});

describe("signIn", () => {
  it("authenticates, stores the token, and returns the user", async () => {
    const payload = makeLoginPayload();
    const tokenResponse = makeTokenResponse();
    const currentUser = makeUserResponse();

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
    const user = makeUserResponse();
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
    const profile = makeUserResponse();

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockResolvedValue(profile);

    await expect(restoreSession()).resolves.toBe(profile);
    expect(userMock).toHaveBeenCalledWith(ACCESS_TOKEN);
  });

  it("removes the rejected token and returns null on HTTP 401", async () => {
    const error = new ApiError(401);

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
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

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(error);
    const removeMock = jest.spyOn(tokenStorage, "removeAccessToken").mockResolvedValue(undefined);

    await expect(restoreSession()).rejects.toBe(error);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("propagates storage read failures without fetching or removing", async () => {
    const error = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const userMock = jest.spyOn(authApi, "getCurrentUser").mockResolvedValue(makeUserResponse());
    const removeMock = jest.spyOn(tokenStorage, "removeAccessToken").mockResolvedValue(undefined);

    await expect(restoreSession()).rejects.toBe(error);
    expect(userMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("propagates cleanup failure when a rejected token cannot be removed", async () => {
    const storageError = new Error("Secure storage unavailable");

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(authApi, "getCurrentUser").mockRejectedValue(new ApiError(401));
    jest.spyOn(tokenStorage, "removeAccessToken").mockRejectedValue(storageError);

    await expect(restoreSession()).rejects.toBe(storageError);
  });
});

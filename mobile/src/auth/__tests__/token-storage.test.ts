import * as SecureStore from "expo-secure-store";
import { getAccessToken, removeAccessToken, saveAccessToken } from "../token-storage";

const TEST_ACCESS_TOKEN = "test-access-token";
const TEST_ACCESS_TOKEN_KEY = "recipe-library.access-token";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";

describe("saveAccessToken", () => {
  it("stores the token under the access-token key", async () => {
    const token = TEST_ACCESS_TOKEN;
    const saveMock = jest.spyOn(SecureStore, "setItemAsync").mockResolvedValue(undefined);

    await saveAccessToken(token);

    expect(saveMock).toHaveBeenCalledWith(TEST_ACCESS_TOKEN_KEY, token);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it("propagates storage write failures", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(SecureStore, "setItemAsync").mockRejectedValue(error);

    await expect(saveAccessToken(TEST_ACCESS_TOKEN)).rejects.toBe(error);
  });
});

describe("getAccessToken", () => {
  it("returns the stored access token", async () => {
    const getMock = jest.spyOn(SecureStore, "getItemAsync").mockResolvedValue(TEST_ACCESS_TOKEN);

    await expect(getAccessToken()).resolves.toBe(TEST_ACCESS_TOKEN);
    expect(getMock).toHaveBeenCalledWith(TEST_ACCESS_TOKEN_KEY);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when no token is stored", async () => {
    jest.spyOn(SecureStore, "getItemAsync").mockResolvedValue(null);

    await expect(getAccessToken()).resolves.toBeNull();
  });

  it("propagates storage read failures", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(SecureStore, "getItemAsync").mockRejectedValue(error);

    await expect(getAccessToken()).rejects.toBe(error);
  });
});

describe("removeAccessToken", () => {
  it("removes the stored access token", async () => {
    const removeMock = jest.spyOn(SecureStore, "deleteItemAsync").mockResolvedValue(undefined);

    await removeAccessToken();
    expect(removeMock).toHaveBeenCalledWith(TEST_ACCESS_TOKEN_KEY);
    expect(removeMock).toHaveBeenCalledTimes(1);
  });

  it("propagates deletion failures", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(SecureStore, "deleteItemAsync").mockRejectedValue(error);

    await expect(removeAccessToken()).rejects.toBe(error);
  });
});

import * as tagsApi from "@/api/tags";
import { ApiError } from "@/api/errors";
import * as tokenStorage from "@/auth/token-storage";
import type { TagListResponse, TagResponse } from "@/types/tag";

import { loadTags, saveTag } from "../tag-service";

const ACCESS_TOKEN = "test-access-token";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const TAG_NAME = "Dinner";
const TOKEN_ERROR_MESSAGE = "No access token available";

describe("loadTags", () => {
  it("loads tags using the stored token", async () => {
    const response: TagListResponse = { items: [{ id: "tag-id", name: "Dinner" }] };

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(tagsApi, "listTags").mockResolvedValue(response);

    expect(await loadTags()).toBe(response);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN);
  });

  it("returns an empty tag list", async () => {
    const response: TagListResponse = { items: [] };

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(tagsApi, "listTags").mockResolvedValue(response);

    expect(await loadTags()).toBe(response);
  });

  it("rejects without requesting tags when no token is stored", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(tagsApi, "listTags").mockResolvedValue({ items: [] });

    await expect(loadTags()).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without requesting tags", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);
    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(tagsApi, "listTags").mockResolvedValue({ items: [] });

    await expect(loadTags()).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates tag API failures: $label", async ({ error }) => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(tagsApi, "listTags").mockRejectedValue(error);

    await expect(loadTags()).rejects.toBe(error);
  });
});

describe("saveTag", () => {
  it("creates a tag with the stored token and returns the saved tag", async () => {
    const response: TagResponse = { id: "tag-id", name: TAG_NAME };
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(tagsApi, "createTag").mockResolvedValue(response);

    expect(await saveTag(TAG_NAME)).toBe(response);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, TAG_NAME);
  });

  it("rejects without creating a tag when no token is stored", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(tagsApi, "createTag");

    await expect(saveTag(TAG_NAME)).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without creating a tag", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);
    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(tagsApi, "createTag");

    await expect(saveTag(TAG_NAME)).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "duplicate name", error: new ApiError(409) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates tag creation failures: $label", async ({ error }) => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(tagsApi, "createTag").mockRejectedValue(error);

    await expect(saveTag(TAG_NAME)).rejects.toBe(error);
  });
});

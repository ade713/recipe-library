import type { TagListResponse, TagResponse } from "@/types/tag";

import * as client from "../client";
import { ApiError } from "../errors";
import { createTag, listTags } from "../tags";

const ACCESS_TOKEN = "test-access-token";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const TAG_ID = "test-tag-id";
const TAG_LIST_ERROR_MESSAGE = "Expected a tag list response";
const TAG_NAME = "Dinner";
const TAG_RESPONSE_ERROR_MESSAGE = "Expected a tag response";
const TAGS_PATH = "/tags";

describe("listTags", () => {
  it("returns tags using the supplied access token", async () => {
    const response: TagListResponse = { items: [{ id: TAG_ID, name: TAG_NAME }] };
    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    const result = await listTags(ACCESS_TOKEN);

    expect(result).toBe(response);
    expect(requestMock).toHaveBeenCalledWith(TAGS_PATH, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
  });

  it("returns an empty tag list", async () => {
    const response: TagListResponse = { items: [] };
    jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await listTags(ACCESS_TOKEN)).toBe(response);
  });

  it("rejects a missing tag list response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(listTags(ACCESS_TOKEN)).rejects.toThrow(TAG_LIST_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "server error", error: new ApiError(500) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates API client failures: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(listTags(ACCESS_TOKEN)).rejects.toBe(error);
  });
});

describe("createTag", () => {
  it("posts a tag name with the supplied token and returns the saved tag", async () => {
    const response: TagResponse = { id: TAG_ID, name: TAG_NAME };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await createTag(ACCESS_TOKEN, TAG_NAME)).toBe(response);
    expect(requestMock).toHaveBeenCalledWith(TAGS_PATH, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ name: TAG_NAME }),
    });
  });

  it("rejects a missing tag response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(createTag(ACCESS_TOKEN, TAG_NAME)).rejects.toThrow(TAG_RESPONSE_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "duplicate name", error: new ApiError(409) },
    { label: "invalid name", error: new ApiError(422) },
    { label: "server error", error: new ApiError(500) },
    { label: "network failure", error: new Error(NETWORK_ERROR_MESSAGE) },
  ])("propagates creation failures unchanged: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(createTag(ACCESS_TOKEN, TAG_NAME)).rejects.toBe(error);
  });
});

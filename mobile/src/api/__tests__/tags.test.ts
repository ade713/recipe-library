import type { TagListResponse } from "@/types/tag";

import * as client from "../client";
import { ApiError } from "../errors";
import { listTags } from "../tags";

const ACCESS_TOKEN = "test-access-token";
const NETWORK_ERROR_MESSAGE = "Network unavailable";
const TAG_ID = "test-tag-id";
const TAG_LIST_ERROR_MESSAGE = "Expected a tag list response";
const TAG_NAME = "Dinner";
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

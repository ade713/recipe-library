import type { TagListResponse, TagResponse } from "@/types/tag";

import { apiFetch } from "./client";

const TAG_LIST_ERROR_MESSAGE = "Expected a tag list response";
const TAG_RESPONSE_ERROR_MESSAGE = "Expected a tag response";
const TAGS_PATH = "/tags";

/** Fetch the authenticated user's tags using the supplied access token. */
export async function listTags(token: string): Promise<TagListResponse> {
  const result = await apiFetch<TagListResponse>(TAGS_PATH, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (result === undefined) {
    throw new Error(TAG_LIST_ERROR_MESSAGE);
  }

  return result;
}

/** Create a tag for the authenticated user using the supplied access token. */
export async function createTag(token: string, name: string): Promise<TagResponse> {
  const result = await apiFetch<TagResponse>(TAGS_PATH, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (result === undefined) {
    throw new Error(TAG_RESPONSE_ERROR_MESSAGE);
  }

  return result;
}

import { createTag, listTags } from "@/api/tags";
import { getAccessToken } from "@/auth/token-storage";
import type { TagListResponse, TagResponse } from "@/types/tag";

const TOKEN_ERROR_MESSAGE = "No access token available";

/** Load the current user's tags using the stored access token. */
export async function loadTags(): Promise<TagListResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return listTags(accessToken);
}

/** Create a tag using the stored access token. */
export async function saveTag(name: string): Promise<TagResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return createTag(accessToken, name);
}

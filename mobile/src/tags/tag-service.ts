import { listTags } from "@/api/tags";
import { getAccessToken } from "@/auth/token-storage";
import type { TagListResponse } from "@/types/tag";

const TOKEN_ERROR_MESSAGE = "No access token available";

/** Load the current user's tags using the stored access token. */
export async function loadTags(): Promise<TagListResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return listTags(accessToken);
}

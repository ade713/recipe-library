import { createNote, listNotes } from "@/api/notes";
import { getAccessToken } from "@/auth/token-storage";
import type { NoteResponse } from "@/types/note";

const TOKEN_ERROR_MESSAGE = "No access token available";

/** Load a recipe's notes using the stored access token. */
export async function loadNotes(recipeId: string): Promise<NoteResponse[]> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return listNotes(accessToken, recipeId);
}

/** Create a personal note using the stored access token. */
export async function saveNote(recipeId: string, note: string): Promise<NoteResponse> {
  const accessToken = await getAccessToken();

  if (accessToken === null) {
    throw new Error(TOKEN_ERROR_MESSAGE);
  }

  return createNote(accessToken, recipeId, note);
}

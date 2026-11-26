import type { NoteResponse } from "@/types/note";

import { apiFetch } from "./client";

const NOTE_ERROR_MESSAGE = "Expected a note response";
const NOTE_LIST_ERROR_MESSAGE = "Expected a note list response";

/** Fetch notes for a recipe using the supplied access token. */
export async function listNotes(token: string, recipeId: string): Promise<NoteResponse[]> {
  const response = await apiFetch<NoteResponse[]>(`/recipes/${recipeId}/notes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response === undefined) {
    throw new Error(NOTE_LIST_ERROR_MESSAGE);
  }

  return response;
}

/** Create a personal note for a recipe using the supplied access token. */
export async function createNote(token: string, recipeId: string, note: string): Promise<NoteResponse> {
  const response = await apiFetch<NoteResponse>(`/recipes/${recipeId}/notes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ note }),
  });

  if (response === undefined) {
    throw new Error(NOTE_ERROR_MESSAGE);
  }

  return response;
}

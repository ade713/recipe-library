import { ApiError } from "@/api/errors";
import * as notesApi from "@/api/notes";
import * as tokenStorage from "@/auth/token-storage";
import type { NoteResponse } from "@/types/note";

import { loadNotes, saveNote, saveNoteChanges } from "../note-service";

const ACCESS_TOKEN = "test-access-token";
const RECIPE_ID = "recipe-one";
const TOKEN_ERROR_MESSAGE = "No access token available";

const networkError = () => new Error("Network unavailable");
const storageError = () => new Error("Secure storage unavailable");

describe("loadNotes", () => {
  it("loads the requested recipe's notes using the stored token", async () => {
    const response: NoteResponse[] = [{ id: "note-one", note: "Use less salt next time." }];

    const tokenMock = jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(notesApi, "listNotes").mockResolvedValue(response);

    expect(await loadNotes(RECIPE_ID)).toBe(response);
    expect(tokenMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, RECIPE_ID);
  });

  it("returns an empty note list unchanged", async () => {
    const response: NoteResponse[] = [];

    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(notesApi, "listNotes").mockResolvedValue(response);

    expect(await loadNotes(RECIPE_ID)).toBe(response);
  });

  it("rejects without requesting notes when no token is stored", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(notesApi, "listNotes");

    await expect(loadNotes(RECIPE_ID)).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failures without requesting notes", async () => {
    const error = storageError();

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(notesApi, "listNotes");

    await expect(loadNotes(RECIPE_ID)).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "unavailable recipe", error: new ApiError(404) },
    { label: "network failure", error: networkError() },
  ])("propagates API failures unchanged: $label", async ({ error }) => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(notesApi, "listNotes").mockRejectedValue(error);

    await expect(loadNotes(RECIPE_ID)).rejects.toBe(error);
  });
});

describe("saveNote", () => {
  it("creates the note with stored credentials and returns the saved object unchanged", async () => {
    const note = "  Less salt next time.\nDouble the sauce.  ";
    const response: NoteResponse = { id: "saved-note", note };

    const tokenMock = jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(notesApi, "createNote").mockResolvedValue(response);

    expect(await saveNote(RECIPE_ID, note)).toBe(response);
    expect(tokenMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, RECIPE_ID, note);
  });

  it("rejects missing credentials without creating a note", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(notesApi, "createNote");

    await expect(saveNote(RECIPE_ID, "Less salt.")).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failure without creating a note", async () => {
    const error = storageError();

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(notesApi, "createNote");

    await expect(saveNote(RECIPE_ID, "Less salt.")).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "unavailable recipe", error: new ApiError(404) },
    { label: "invalid note", error: new ApiError(422) },
    { label: "network failure", error: networkError() },
  ])("propagates creation failures unchanged: $label", async ({ error }) => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(notesApi, "createNote").mockRejectedValue(error);

    await expect(saveNote(RECIPE_ID, "Less salt.")).rejects.toBe(error);
  });
});

describe("saveNoteChanges", () => {
  const noteId = "existing-note";
  const note = "  Less salt next time.\nDouble the sauce.  ";

  it("updates the specific note with stored credentials and returns the saved object unchanged", async () => {
    const response: NoteResponse = { id: noteId, note: "Updated by the backend." };
    const tokenMock = jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    const requestMock = jest.spyOn(notesApi, "updateNote").mockResolvedValue(response);

    expect(await saveNoteChanges(RECIPE_ID, noteId, note)).toBe(response);
    expect(tokenMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(ACCESS_TOKEN, RECIPE_ID, noteId, note);
  });

  it("rejects missing credentials without updating a note", async () => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(null);
    const requestMock = jest.spyOn(notesApi, "updateNote");

    await expect(saveNoteChanges(RECIPE_ID, noteId, note)).rejects.toThrow(TOKEN_ERROR_MESSAGE);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("propagates storage failure without updating a note", async () => {
    const error = storageError();

    jest.spyOn(tokenStorage, "getAccessToken").mockRejectedValue(error);
    const requestMock = jest.spyOn(notesApi, "updateNote");

    await expect(saveNoteChanges(RECIPE_ID, noteId, note)).rejects.toBe(error);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "unavailable note", error: new ApiError(404) },
    { label: "invalid note", error: new ApiError(422) },
    { label: "network failure", error: networkError() },
  ])("propagates update failures unchanged: $label", async ({ error }) => {
    jest.spyOn(tokenStorage, "getAccessToken").mockResolvedValue(ACCESS_TOKEN);
    jest.spyOn(notesApi, "updateNote").mockRejectedValue(error);

    await expect(saveNoteChanges(RECIPE_ID, noteId, note)).rejects.toBe(error);
  });
});

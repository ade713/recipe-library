import type { NoteResponse } from "@/types/note";

import { ApiError } from "../errors";
import { createNote, listNotes, updateNote } from "../notes";
import * as client from "../client";

const ACCESS_TOKEN = "test-access-token";
const NOTE = '  Use less salt.\nTry "smoked" paprika.  ';
const NOTE_ERROR_MESSAGE = "Expected a note response";
const NOTE_LIST_ERROR_MESSAGE = "Expected a note list response";
const RECIPE_ID = "recipe-one";

const networkError = () => new Error("Network unavailable");

describe("updateNote", () => {
  const noteId = "existing-note-id";

  it("patches the specific recipe note and returns the updated object unchanged", async () => {
    const response: NoteResponse = { id: noteId, note: NOTE };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await updateNote(ACCESS_TOKEN, RECIPE_ID, noteId, NOTE)).toBe(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}/notes/${noteId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ note: NOTE }),
    });
  });

  it("rejects a missing updated-note response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(updateNote(ACCESS_TOKEN, RECIPE_ID, noteId, "Less salt.")).rejects.toThrow(NOTE_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "unavailable note", error: new ApiError(404) },
    { label: "invalid note", error: new ApiError(422) },
    { label: "server failure", error: new ApiError(500) },
    { label: "network failure", error: networkError() },
  ])("propagates update failures unchanged: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(updateNote(ACCESS_TOKEN, RECIPE_ID, noteId, "Less salt.")).rejects.toBe(error);
  });
});

describe("listNotes", () => {
  it("requests the recipe's notes with the supplied token and returns the array unchanged", async () => {
    const response: NoteResponse[] = [{ id: "note-one", note: NOTE }];

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await listNotes(ACCESS_TOKEN, RECIPE_ID)).toBe(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}/notes`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
  });

  it("returns an empty array for a recipe without notes", async () => {
    const response: NoteResponse[] = [];

    jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await listNotes(ACCESS_TOKEN, RECIPE_ID)).toBe(response);
  });

  it("rejects a missing response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(listNotes(ACCESS_TOKEN, RECIPE_ID)).rejects.toThrow(NOTE_LIST_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "unavailable recipe", error: new ApiError(404) },
    { label: "server failure", error: new ApiError(500) },
    { label: "network failure", error: networkError() },
  ])("propagates failures unchanged: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(listNotes(ACCESS_TOKEN, RECIPE_ID)).rejects.toBe(error);
  });
});

describe("createNote", () => {
  it("posts the supplied text to the recipe and returns the saved note unchanged", async () => {
    const response: NoteResponse = { id: "saved-note-id", note: NOTE };

    const requestMock = jest.spyOn(client, "apiFetch").mockResolvedValue(response);

    expect(await createNote(ACCESS_TOKEN, RECIPE_ID, NOTE)).toBe(response);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}/notes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ note: NOTE }),
    });
  });

  it("rejects a missing saved-note response", async () => {
    jest.spyOn(client, "apiFetch").mockResolvedValue(undefined);

    await expect(createNote(ACCESS_TOKEN, RECIPE_ID, NOTE)).rejects.toThrow(NOTE_ERROR_MESSAGE);
  });

  it.each([
    { label: "unauthorized", error: new ApiError(401) },
    { label: "unavailable recipe", error: new ApiError(404) },
    { label: "invalid note", error: new ApiError(422) },
    { label: "server failure", error: new ApiError(500) },
    { label: "network failure", error: networkError() },
  ])("propagates creation failures unchanged: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(createNote(ACCESS_TOKEN, RECIPE_ID, NOTE)).rejects.toBe(error);
  });
});

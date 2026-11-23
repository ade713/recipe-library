import type { NoteResponse } from "@/types/note";

import { ApiError } from "../errors";
import { listNotes } from "../notes";
import * as client from "../client";

const ACCESS_TOKEN = "test-access-token";
const NOTE_LIST_ERROR_MESSAGE = "Expected a note list response";
const RECIPE_ID = "recipe-one";

describe("listNotes", () => {
  it("requests the recipe's notes with the supplied token and returns the array unchanged", async () => {
    const response: NoteResponse[] = [{ id: "note-one", note: "Use less salt next time." }];

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
    { label: "network failure", error: new Error("Network unavailable") },
  ])("propagates failures unchanged: $label", async ({ error }) => {
    jest.spyOn(client, "apiFetch").mockRejectedValue(error);

    await expect(listNotes(ACCESS_TOKEN, RECIPE_ID)).rejects.toBe(error);
  });
});

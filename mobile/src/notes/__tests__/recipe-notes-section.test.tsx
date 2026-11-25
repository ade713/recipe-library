import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { NoteResponse } from "@/types/note";

import { RecipeNotesSection } from "../recipe-notes-section";
import * as noteService from "../note-service";

const EMPTY_MESSAGE = "No personal notes yet.";
const ERROR_MESSAGE = "Unable to load notes.";
const HEADING = "Personal notes";
const LOADING_MESSAGE = "Loading notes...";
const RECIPE_ID = "recipe-one";
const RETRY_LABEL = "Retry notes";

const renderRecipeNotesSection = async ({ isFocused } = { isFocused: true }) => {
  await render(<RecipeNotesSection recipeId={RECIPE_ID} isFocused={isFocused} />);
};

describe("RecipeNotesSection", () => {
  it("waits for focus before loading notes", async () => {
    const loadMock = jest.spyOn(noteService, "loadNotes").mockResolvedValue([]);

    await renderRecipeNotesSection({ isFocused: false });

    expect(loadMock).not.toHaveBeenCalled();

    await screen.rerender(<RecipeNotesSection recipeId={RECIPE_ID} isFocused />);
    expect(await screen.findByText(EMPTY_MESSAGE)).toBeTruthy();
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it.each(["success", "failure"] as const)(
    "ignores a late %s after losing focus and reloads on return",
    async (outcome) => {
      const oldNote = { id: "old-note", note: "Stale note from before leaving." };
      const newNote = { id: "new-note", note: "Fresh note after returning." };

      let resolveOld!: (notes: NoteResponse[]) => void;
      let rejectOld!: (error: Error) => void;
      const loadMock = jest
        .spyOn(noteService, "loadNotes")
        .mockReturnValueOnce(
          new Promise((resolve, reject) => {
            resolveOld = resolve;
            rejectOld = reject;
          }),
        )
        .mockResolvedValueOnce([newNote]);

      await renderRecipeNotesSection();

      await screen.rerender(<RecipeNotesSection recipeId={RECIPE_ID} isFocused={false} />);

      await act(async () => {
        if (outcome === "success") resolveOld([oldNote]);
        else rejectOld(new Error("Late failure"));
      });

      expect(screen.queryByText(oldNote.note)).toBeNull();
      expect(screen.queryByText(ERROR_MESSAGE)).toBeNull();
      expect(loadMock).toHaveBeenCalledTimes(1);

      await screen.rerender(<RecipeNotesSection recipeId={RECIPE_ID} isFocused />);

      expect(await screen.findByText(newNote.note)).toBeTruthy();
      expect(screen.queryByText(oldNote.note)).toBeNull();
      expect(loadMock).toHaveBeenCalledTimes(2);
      expect(loadMock).toHaveBeenLastCalledWith(RECIPE_ID);
    },
  );

  it.each(["success", "failure"] as const)(
    "ignores stale %s and keeps the current recipe loading until its own request finishes",
    async (outcome) => {
      const nextRecipeId = "recipe-two";
      const staleNote = { id: "old-note", note: "Only for the old recipe." };
      const currentNote = { id: "current-note", note: "Only for the current recipe." };

      let resolveOld!: (notes: NoteResponse[]) => void;
      let rejectOld!: (error: Error) => void;
      let resolveCurrent!: (notes: NoteResponse[]) => void;
      const loadMock = jest
        .spyOn(noteService, "loadNotes")
        .mockReturnValueOnce(
          new Promise((resolve, reject) => {
            resolveOld = resolve;
            rejectOld = reject;
          }),
        )
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveCurrent = resolve;
          }),
        );

      await renderRecipeNotesSection();

      await screen.rerender(<RecipeNotesSection recipeId={nextRecipeId} />);

      await act(async () => {
        if (outcome === "success") resolveOld([staleNote]);
        else rejectOld(new Error("Old request failed"));
      });

      try {
        expect(screen.getByText(LOADING_MESSAGE)).toBeTruthy();
        expect(screen.queryByText(staleNote.note)).toBeNull();
        expect(screen.queryByText(ERROR_MESSAGE)).toBeNull();
        expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
        expect(loadMock).toHaveBeenNthCalledWith(1, RECIPE_ID);
        expect(loadMock).toHaveBeenNthCalledWith(2, nextRecipeId);
      } finally {
        await act(async () => {
          resolveCurrent([currentNote]);
        });
      }

      expect(await screen.findByText(currentNote.note)).toBeTruthy();
      expect(screen.queryByText(staleNote.note)).toBeNull();
      expect(screen.queryByText(ERROR_MESSAGE)).toBeNull();
      expect(screen.queryByText(LOADING_MESSAGE)).toBeNull();
    },
  );

  it("clears previously displayed notes while loading a different recipe", async () => {
    const oldNote = { id: "old-note", note: "This belongs to the first recipe." };

    let resolveNext!: (notes: NoteResponse[]) => void;
    jest
      .spyOn(noteService, "loadNotes")
      .mockResolvedValueOnce([oldNote])
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNext = resolve;
        }),
      );

    await renderRecipeNotesSection();

    await screen.findByText(oldNote.note);
    await screen.rerender(<RecipeNotesSection recipeId='recipe-two' />);

    try {
      expect(screen.queryByText(oldNote.note)).toBeNull();
      expect(screen.getByText(LOADING_MESSAGE)).toBeTruthy();
      expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
    } finally {
      await act(async () => {
        resolveNext([]);
      });
    }

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(oldNote.note)).toBeNull();
  });

  it("shows safe failure feedback instead of an empty result", async () => {
    const privateMessageError = "Private request failure";

    jest.spyOn(noteService, "loadNotes").mockRejectedValue(new Error(privateMessageError));

    await renderRecipeNotesSection();

    expect(await screen.findByText(ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateMessageError)).toBeNull();
    expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_MESSAGE)).toBeNull();
    expect(screen.getByRole("button", { name: RETRY_LABEL })).toBeEnabled();
  });

  it("retries the same recipe, clears old feedback while pending, and displays recovered notes", async () => {
    const recoveredNote = { id: "recovered-note", note: "Roast for five more minutes." };

    const loadMock = jest.spyOn(noteService, "loadNotes").mockRejectedValueOnce(new Error("Unavailable"));

    await renderRecipeNotesSection();

    await screen.findByText(ERROR_MESSAGE);

    let resolveRetry!: (notes: NoteResponse[]) => void;
    loadMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRetry = resolve;
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: RETRY_LABEL }));

    try {
      expect(screen.getByText(LOADING_MESSAGE)).toBeTruthy();
      expect(screen.queryByText(ERROR_MESSAGE)).toBeNull();
      expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
      expect(screen.queryByRole("button", { name: RETRY_LABEL })).toBeNull();
      expect(loadMock).toHaveBeenCalledTimes(2);
      expect(loadMock).toHaveBeenLastCalledWith(RECIPE_ID);
    } finally {
      await act(async () => {
        resolveRetry([recoveredNote]);
      });
    }

    expect(await screen.findByText(recoveredNote.note)).toBeTruthy();
    expect(screen.queryByText(ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_MESSAGE)).toBeNull();
  });

  it("loads notes for the recipe and renders their text under a separate heading", async () => {
    const notes: NoteResponse[] = [
      { id: "note-one", note: "Use less salt next time." },
      { id: "note-two", note: "Family favorite.\nDouble the sauce." },
    ];
    const loadMock = jest.spyOn(noteService, "loadNotes").mockResolvedValue(notes);

    await renderRecipeNotesSection();

    expect(await screen.findByText(notes[0].note)).toBeTruthy();
    expect(screen.getByText(notes[1].note)).toBeTruthy();
    expect(screen.getByRole("header", { name: HEADING })).toBeTruthy();
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledWith(RECIPE_ID);
    expect(screen.queryByText(LOADING_MESSAGE)).toBeNull();
    expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
  });

  it("shows loading feedback before distinguishing a successful empty result", async () => {
    let resolveNotes!: (notes: NoteResponse[]) => void;
    jest.spyOn(noteService, "loadNotes").mockReturnValue(
      new Promise((resolve) => {
        resolveNotes = resolve;
      }),
    );

    await renderRecipeNotesSection();

    try {
      expect(screen.getByRole("header", { name: HEADING })).toBeTruthy();
      expect(screen.getByText(LOADING_MESSAGE)).toBeTruthy();
      expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
    } finally {
      await act(async () => {
        resolveNotes([]);
      });
    }

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(LOADING_MESSAGE)).toBeNull();
  });
});

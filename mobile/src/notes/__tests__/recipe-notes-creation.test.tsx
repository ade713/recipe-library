import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { NoteResponse } from "@/types/note";

import { RecipeNotesSection } from "../recipe-notes-section";
import * as noteService from "../note-service";

const EMPTY_MESSAGE = "No personal notes yet.";
const INPUT_LABEL = "Personal note";
const RECIPE_ID = "recipe-one";
const SUBMIT_LABEL = "Add note";

const EXISTING_NOTE = { id: "existing-note", note: "Use fresh herbs." };
const SAVED_NOTE = { id: "saved-note", note: "Double the sauce." };

const renderRecipeNotesSection = async () => {
  await render(<RecipeNotesSection recipeId={RECIPE_ID} />);
};

describe("RecipeNotesSection creation", () => {
  it("preserves notes and input after save failure, then appends once on retry", async () => {
    const typedNote = `  ${SAVED_NOTE.note}  `;
    const privateErrorMessage = "Private save failure";
    const noteSaveErrorMessage = "Unable to add note. Please try again.";

    const loadMock = jest.spyOn(noteService, "loadNotes").mockResolvedValue([EXISTING_NOTE]);
    const saveMock = jest
      .spyOn(noteService, "saveNote")
      .mockRejectedValueOnce(new Error(privateErrorMessage))
      .mockResolvedValueOnce(SAVED_NOTE);

    await renderRecipeNotesSection();

    await fireEvent.changeText(await screen.findByLabelText(INPUT_LABEL), typedNote);
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));

    expect(await screen.findByText(noteSaveErrorMessage)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.getByText(EXISTING_NOTE.note)).toBeTruthy();
    expect(screen.queryByText(SAVED_NOTE.note)).toBeNull();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(typedNote);

    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    expect(await screen.findByText(SAVED_NOTE.note)).toBeTruthy();
    expect(screen.getAllByText(SAVED_NOTE.note)).toHaveLength(1);
    expect(screen.getByText(EXISTING_NOTE.note)).toBeTruthy();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("");
    expect(screen.queryByText(noteSaveErrorMessage)).toBeNull();
    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenLastCalledWith(RECIPE_ID, SAVED_NOTE.note);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { label: "empty", initialNotes: [] as NoteResponse[] },
    { label: "populated", initialNotes: [EXISTING_NOTE] },
  ])("adds the returned note without reloading the $label list", async ({ initialNotes }) => {
    const loadMock = jest.spyOn(noteService, "loadNotes").mockResolvedValue(initialNotes);
    const saveMock = jest.spyOn(noteService, "saveNote").mockResolvedValue(SAVED_NOTE);

    await renderRecipeNotesSection();

    const input = await screen.findByLabelText(INPUT_LABEL);
    await fireEvent.changeText(input, `  ${SAVED_NOTE.note}  `);
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));

    expect(await screen.findByText(SAVED_NOTE.note)).toBeTruthy();
    for (const note of initialNotes) {
      expect(screen.getByText(note.note)).toBeTruthy();
    }
    expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("");
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, SAVED_NOTE.note);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it("offers creation only after notes load successfully", async () => {
    const loadingNotesMessage = "Loading notes...";

    let resolveNotes!: (notes: NoteResponse[]) => void;
    jest.spyOn(noteService, "loadNotes").mockReturnValue(
      new Promise((resolve) => {
        resolveNotes = resolve;
      }),
    );

    await renderRecipeNotesSection();

    try {
      expect(screen.getByText(loadingNotesMessage)).toBeTruthy();
      expect(screen.queryByLabelText(INPUT_LABEL)).toBeNull();
      expect(screen.queryByRole("button", { name: SUBMIT_LABEL })).toBeNull();
    } finally {
      await act(async () => {
        resolveNotes([]);
      });
    }
    expect(await screen.findByLabelText(INPUT_LABEL)).toBeTruthy();
  });

  it("keeps creation hidden after a notes-loading failure", async () => {
    const loadNotesErrorMessage = "Unable to load notes.";
    const unavailableErrorMessage = "Unavailable";

    jest.spyOn(noteService, "loadNotes").mockRejectedValue(new Error(unavailableErrorMessage));

    await renderRecipeNotesSection();

    expect(await screen.findByText(loadNotesErrorMessage)).toBeTruthy();
    expect(screen.queryByLabelText(INPUT_LABEL)).toBeNull();
    expect(screen.queryByRole("button", { name: SUBMIT_LABEL })).toBeNull();
  });
});

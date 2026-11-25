import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as noteService from "@/notes/note-service";
import type { NoteResponse } from "@/types/note";

import { RecipeDetailScreen } from "../recipe-detail-screen";
import * as recipeService from "../recipe-service";

const NOTE = { id: "personal-note", note: "Use less salt next time." };
const NOTES_ERROR = "Unable to load notes.";
const NOTES_HEADING = "Personal notes";
const RECIPE_ID = "recipe-with-notes";

const renderRecipeDetailScreen = async () => {
  await render(<RecipeDetailScreen recipeId={RECIPE_ID} />);
};

describe("recipe detail personal notes", () => {
  it("passes focus changes to notes and loads fresh notes when returning", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    let resolveOld!: (notes: NoteResponse[]) => void;
    const staleNote = { id: "stale-note", note: "Old request result." };
    const loadMock = jest
      .spyOn(noteService, "loadNotes")
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
      )
      .mockResolvedValueOnce([NOTE]);

    await renderRecipeDetailScreen();

    await screen.findByText("Loading notes...");

    await screen.rerender(<RecipeDetailScreen recipeId={RECIPE_ID} isFocused={false} />);

    await act(async () => {
      resolveOld([staleNote]);
    });
    expect(screen.queryByText(staleNote.note)).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(1);

    await screen.rerender(<RecipeDetailScreen recipeId={RECIPE_ID} isFocused />);
    expect(await screen.findByText(NOTE.note)).toBeTruthy();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the recipe readable while its notes load independently", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    let resolveNotes!: (notes: NoteResponse[]) => void;
    const loadMock = jest.spyOn(noteService, "loadNotes").mockReturnValue(
      new Promise((resolve) => {
        resolveNotes = resolve;
      }),
    );

    await renderRecipeDetailScreen();

    await screen.findByText(recipe.title);

    try {
      expect(screen.getByRole("header", { name: NOTES_HEADING })).toBeTruthy();
      expect(screen.getByText("Loading notes...")).toBeTruthy();
      expect(screen.getByText("Ingredients")).toBeTruthy();
      expect(screen.getByText("Instructions")).toBeTruthy();
      expect(loadMock).toHaveBeenCalledWith(RECIPE_ID);
    } finally {
      // The guard also allows this test to fail cleanly before integration exists.
      if (resolveNotes) {
        await act(async () => {
          resolveNotes([NOTE]);
        });
      }
    }

    expect(await screen.findByText(NOTE.note)).toBeTruthy();
    expect(screen.getByText(recipe.title)).toBeTruthy();
  });

  it("retries a notes failure without reloading or hiding the recipe", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID });

    const recipeMock = jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const notesMock = jest
      .spyOn(noteService, "loadNotes")
      .mockRejectedValueOnce(new Error("Private notes failure"))
      .mockResolvedValueOnce([NOTE]);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(NOTES_ERROR)).toBeTruthy();
    expect(screen.getByText(recipe.title)).toBeTruthy();
    expect(screen.queryByText("Private notes failure")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Retry notes" }));
    expect(await screen.findByText(NOTE.note)).toBeTruthy();
    expect(screen.queryByText(NOTES_ERROR)).toBeNull();
    expect(recipeMock).toHaveBeenCalledTimes(1);
    expect(notesMock).toHaveBeenCalledTimes(2);
    expect(notesMock).toHaveBeenLastCalledWith(RECIPE_ID);
  });

  it("does not load notes when the recipe is unavailable", async () => {
    jest.spyOn(recipeService, "loadRecipe").mockRejectedValue(new Error("Recipe unavailable"));
    const notesMock = jest.spyOn(noteService, "loadNotes").mockResolvedValue([]);

    await renderRecipeDetailScreen();

    expect(await screen.findByText("Unable to load recipe.")).toBeTruthy();
    expect(screen.queryByRole("header", { name: NOTES_HEADING })).toBeNull();
    expect(notesMock).not.toHaveBeenCalled();
  });
});

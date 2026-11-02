import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeDetailResponse } from "@/types/recipe";
import * as recipeService from "../recipe-service";
import { RecipeTitleEditScreen } from "../recipe-title-edit-screen";

const EDITED_TITLE = "Updated soup";
const RECIPE_ID = "recipe-one";
const RECIPE_ID_2 = "recipe-two";
const RECIPE_TITLE = "Soup";
const CURRENT_RECIPE_TITLE = "Current recipe";
const TITLE_LABEL = "Recipe title";
const LOADING_TEXT = "Loading recipe...";
const LOAD_ERROR = "Unable to load recipe.";
const SAVE_CHANGES_LABEL = "Save changes";

const renderScreen = async (onSaved = jest.fn()) => {
  await render(<RecipeTitleEditScreen recipeId={RECIPE_ID} onSaved={onSaved} />);
};

describe("RecipeTitleEditScreen", () => {
  it("loads the requested recipe without exposing an empty editable form", async () => {
    const loadMock = jest.spyOn(recipeService, "loadRecipe").mockImplementation(() => new Promise(() => {}));

    await renderScreen();

    expect(loadMock).toHaveBeenCalledWith(RECIPE_ID);
    expect(screen.getByText(LOADING_TEXT)).toBeTruthy();
    expect(screen.queryByLabelText(TITLE_LABEL)).toBeNull();
  });

  it("prefills the form after loading succeeds", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: RECIPE_TITLE });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderScreen();

    expect(await screen.findByLabelText(TITLE_LABEL)).toHaveDisplayValue(recipe.title);
    expect(screen.queryByText(LOADING_TEXT)).toBeNull();
  });

  it("shows safe loading feedback and retries without exposing private errors", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID });
    const privateErrorMessage = "Private failure";
    const retryButtonText = "Retry";

    const loadMock = jest
      .spyOn(recipeService, "loadRecipe")
      .mockRejectedValueOnce(new Error(privateErrorMessage))
      .mockResolvedValueOnce(recipe);

    await renderScreen();

    expect(await screen.findByText(LOAD_ERROR)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.queryByLabelText(TITLE_LABEL)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: retryButtonText }));
    expect(await screen.findByLabelText(TITLE_LABEL)).toHaveDisplayValue(recipe.title);
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("initializes a new draft when the recipe ID changes", async () => {
    const first = makeRecipeDetailResponse({ id: RECIPE_ID, title: RECIPE_TITLE });
    const second = makeRecipeDetailResponse({ id: RECIPE_ID_2, title: "Salad" });
    const editedTitleText = "Unsaved soup edit";

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    await renderScreen();

    await fireEvent.changeText(await screen.findByLabelText(TITLE_LABEL), editedTitleText);

    await screen.rerender(<RecipeTitleEditScreen recipeId={second.id} onSaved={jest.fn()} />);
    expect(await screen.findByDisplayValue(second.title)).toBeTruthy();
    expect(screen.queryByDisplayValue(editedTitleText)).toBeNull();
  });

  it("ignores a late response from the previously requested recipe", async () => {
    let resolveFirst!: (recipe: RecipeDetailResponse) => void;
    const pending = new Promise<RecipeDetailResponse>((resolve) => {
      resolveFirst = resolve;
    });
    const first = makeRecipeDetailResponse({ id: RECIPE_ID, title: "Old recipe" });
    const second = makeRecipeDetailResponse({ id: RECIPE_ID_2, title: CURRENT_RECIPE_TITLE });

    jest.spyOn(recipeService, "loadRecipe").mockReturnValueOnce(pending).mockResolvedValueOnce(second);

    await renderScreen();

    await screen.rerender(<RecipeTitleEditScreen recipeId={second.id} onSaved={jest.fn()} />);
    expect(await screen.findByLabelText(TITLE_LABEL)).toHaveDisplayValue(second.title);

    await act(async () => {
      resolveFirst(first);
    });
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(second.title);
  });

  it("ignores a late failure from the previously requested recipe", async () => {
    let rejectFirst!: (error: Error) => void;
    const pending = new Promise<RecipeDetailResponse>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const second = makeRecipeDetailResponse({ id: RECIPE_ID_2, title: CURRENT_RECIPE_TITLE });

    jest.spyOn(recipeService, "loadRecipe").mockReturnValueOnce(pending).mockResolvedValueOnce(second);

    await renderScreen();

    await screen.rerender(<RecipeTitleEditScreen recipeId={second.id} onSaved={jest.fn()} />);
    expect(await screen.findByLabelText(TITLE_LABEL)).toHaveDisplayValue(second.title);

    await act(async () => {
      rejectFirst(new Error("Previous request failed"));
    });

    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(second.title);
  });

  it("saves only the edited title for the loaded recipe and reports the saved response", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: RECIPE_TITLE });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: EDITED_TITLE });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);
    const onSaved = jest.fn();

    await renderScreen(onSaved);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_LABEL), `  ${EDITED_TITLE}  `);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, { title: EDITED_TITLE });
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("preserves edits after a failed update and reports success only after retry", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: RECIPE_TITLE });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: EDITED_TITLE });
    const saveError = "Unable to save changes. Please try again.";
    const privateError = "Private save failure";

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest
      .spyOn(recipeService, "saveRecipeChanges")
      .mockRejectedValueOnce(new Error(privateError))
      .mockResolvedValueOnce(savedRecipe);

    const onSaved = jest.fn();

    await renderScreen(onSaved);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_LABEL), EDITED_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));
    expect(await screen.findByText(saveError)).toBeTruthy();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByText(privateError)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));
    expect(saveMock).toHaveBeenNthCalledWith(2, RECIPE_ID, { title: EDITED_TITLE });
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
    expect(screen.queryByText(saveError)).toBeNull();
  });
});

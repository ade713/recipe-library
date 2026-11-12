import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeDetailResponse } from "@/types/recipe";

import * as recipeService from "../recipe-service";
import { RecipeEditScreen } from "../recipe-edit-screen";

const CURRENT_RECIPE_TITLE = "Current recipe";
const EDITED_TITLE = "Updated soup";
const LOAD_ERROR_MESSAGE = "Unable to load recipe.";
const LOADING_TEXT = "Loading recipe...";
const RECIPE_ID = "recipe-one";
const RECIPE_ID_2 = "recipe-two";
const RECIPE_TITLE = "Soup";
const SAVE_CHANGES_LABEL = "Save changes";
const TITLE_LABEL = "Recipe title";

const renderScreen = async (onSaved = jest.fn()) => {
  await render(<RecipeEditScreen recipeId={RECIPE_ID} onSaved={onSaved} />);
};

describe("RecipeEditScreen", () => {
  it.each([false, true])("loads saved ingredients and saves them with clearAll=%p", async (clearAll) => {
    const ingredientInputLabel = "Ingredient 1";
    const removeIngredientLabel = "Remove ingredient 1";
    const ingredients = [
      {
        position: 1,
        original_text: "2 cups chopped carrots",
        quantity: "2.00",
        quantity_text: "2",
        unit: "cups",
        name: "carrots",
        preparation_note: "chopped",
        is_optional: true,
        scale_locked: true,
        parse_status: "parsed",
      },
    ];
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, ingredients });
    const expectedIngredients = clearAll ? [] : ingredients;
    const savedRecipe = makeRecipeDetailResponse({
      id: RECIPE_ID,
      title: EDITED_TITLE,
      ingredients: expectedIngredients,
    });

    const onSaved = jest.fn();
    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);

    await renderScreen(onSaved);

    expect(await screen.findByLabelText(ingredientInputLabel)).toHaveDisplayValue(ingredients[0].original_text);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);
    if (clearAll) {
      await fireEvent.press(screen.getByRole("button", { name: removeIngredientLabel }));
    }
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(
      RECIPE_ID,
      expect.objectContaining({ title: EDITED_TITLE, ingredients: expectedIngredients }),
    );
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });

  it.each([false, true])("loads saved tips and saves them with clearAll=%p", async (clearAll) => {
    const removeTipLabel = "Remove tip 1";
    const tipInputLabel = "Tip 1";
    const tips = [{ position: 1, tip: "Serve warm" }];
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, tips });
    const expectedTips = clearAll ? [] : tips;
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: EDITED_TITLE, tips: expectedTips });

    const onSaved = jest.fn();
    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);

    await renderScreen(onSaved);

    expect(await screen.findByLabelText(tipInputLabel)).toHaveDisplayValue(tips[0].tip);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);
    if (clearAll) {
      await fireEvent.press(screen.getByRole("button", { name: removeTipLabel }));
    }
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(
      RECIPE_ID,
      expect.objectContaining({ title: EDITED_TITLE, tips: expectedTips }),
    );
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });

  it.each([false, true])("loads saved instructions and saves them with clearAll=%p", async (clearAll) => {
    const removeStepLabel = "Remove step 1";
    const steps = [{ position: 1, instruction: "Simmer gently", section_title: "Cooking" }];
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, steps });
    const expectedSteps = clearAll ? [] : steps;
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, steps: expectedSteps });

    const onSaved = jest.fn();
    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);

    await renderScreen(onSaved);

    expect(await screen.findByLabelText("Step 1")).toHaveDisplayValue(steps[0].instruction);

    if (clearAll) {
      await fireEvent.press(screen.getByRole("button", { name: removeStepLabel }));
    }
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, expect.objectContaining({ steps: expectedSteps }));
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });

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

    expect(await screen.findByText(LOAD_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.queryByLabelText(TITLE_LABEL)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: retryButtonText }));
    expect(await screen.findByLabelText(TITLE_LABEL)).toHaveDisplayValue(recipe.title);
    expect(screen.queryByText(LOAD_ERROR_MESSAGE)).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("initializes a new draft when the recipe ID changes", async () => {
    const first = makeRecipeDetailResponse({ id: RECIPE_ID, title: RECIPE_TITLE });
    const second = makeRecipeDetailResponse({ id: RECIPE_ID_2, title: "Salad" });
    const editedTitleText = "Unsaved soup edit";

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    await renderScreen();

    await fireEvent.changeText(await screen.findByLabelText(TITLE_LABEL), editedTitleText);

    await screen.rerender(<RecipeEditScreen recipeId={second.id} onSaved={jest.fn()} />);
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

    await screen.rerender(<RecipeEditScreen recipeId={second.id} onSaved={jest.fn()} />);
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

    await screen.rerender(<RecipeEditScreen recipeId={second.id} onSaved={jest.fn()} />);
    expect(await screen.findByLabelText(TITLE_LABEL)).toHaveDisplayValue(second.title);

    await act(async () => {
      rejectFirst(new Error("Previous request failed"));
    });

    expect(screen.queryByText(LOAD_ERROR_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(second.title);
  });

  it("saves the edited title and empty description for the loaded recipe and reports the saved response", async () => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: RECIPE_TITLE });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, title: EDITED_TITLE });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);
    const onSaved = jest.fn();

    await renderScreen(onSaved);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_LABEL), `  ${EDITED_TITLE}  `);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, {
      title: EDITED_TITLE,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
      image_url: null,
      ingredients: [],
      steps: [],
      tips: [],
      is_favorite: false,
    });
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
    expect(saveMock).toHaveBeenNthCalledWith(2, RECIPE_ID, {
      title: EDITED_TITLE,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
      image_url: null,
      ingredients: [],
      steps: [],
      tips: [],
      is_favorite: false,
    });
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
    expect(screen.queryByText(saveError)).toBeNull();
  });

  it.each([
    { label: "untouched", input: undefined, expected: "Original description" },
    { label: "edited", input: "  First line.\nSecond line.  ", expected: "First line.\nSecond line." },
    { label: "cleared", input: "  ", expected: null },
  ])("prefills and submits the recipe description: $label", async ({ input, expected }) => {
    const originalDescription = "Original description";
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, description: originalDescription });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, description: expected });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);
    const onSaved = jest.fn();

    await renderScreen(onSaved);

    const descriptionInput = await screen.findByLabelText("Description (optional)");
    expect(descriptionInput).toHaveDisplayValue(originalDescription);

    if (input !== undefined) {
      await fireEvent.changeText(descriptionInput, input);
    }
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, {
      title: recipe.title,
      description: expected,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
      image_url: null,
      ingredients: [],
      steps: [],
      tips: [],
      is_favorite: false,
    });
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });

  it.each([
    { label: "untouched", prep: undefined, cook: undefined, total: undefined, expected: [0, 20, 45] },
    { label: "edited", prep: "10", cook: "0", total: "90", expected: [10, 0, 90] },
    { label: "cleared", prep: "", cook: "  ", total: "", expected: [null, null, null] },
  ])("prefills and submits saved times: $label", async ({ prep, cook, total, expected }) => {
    const recipe = makeRecipeDetailResponse({
      id: RECIPE_ID,
      prep_time_minutes: 0,
      cook_time_minutes: 20,
      total_time_minutes: 45,
    });
    const fields = ["Prep time (minutes)", "Cook time (minutes)", "Total time (minutes)"];
    const inputs = [prep, cook, total];

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(recipe);

    await renderScreen();

    await screen.findByLabelText(fields[0]);
    for (const [index, value] of ["0", "20", "45"].entries()) {
      expect(screen.getByLabelText(fields[index])).toHaveDisplayValue(value);
      const input = inputs[index];
      if (input !== undefined) await fireEvent.changeText(screen.getByLabelText(fields[index]), input);
    }

    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, {
      title: recipe.title,
      description: null,
      prep_time_minutes: expected[0],
      cook_time_minutes: expected[1],
      total_time_minutes: expected[2],
      base_servings: null,
      servings_unit: null,
      image_url: null,
      ingredients: [],
      steps: [],
      tips: [],
      is_favorite: false,
    });
  });

  it.each([
    { label: "untouched", quantity: undefined, unit: undefined, expectedQuantity: 1.5, expectedUnit: "loaves" },
    { label: "edited", quantity: "0", unit: "  small loaves  ", expectedQuantity: 0, expectedUnit: "small loaves" },
    { label: "quantity cleared", quantity: "  ", unit: undefined, expectedQuantity: null, expectedUnit: "loaves" },
    { label: "unit cleared", quantity: undefined, unit: "  ", expectedQuantity: 1.5, expectedUnit: null },
  ])("prefills and submits saved servings: $label", async ({ quantity, unit, expectedQuantity, expectedUnit }) => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, base_servings: "1.5", servings_unit: "loaves" });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(recipe);

    await renderScreen();

    const quantityInput = await screen.findByLabelText("Servings or yield quantity");
    const unitInput = screen.getByLabelText("Yield unit (optional)");
    expect(quantityInput).toHaveDisplayValue("1.5");
    expect(unitInput).toHaveDisplayValue("loaves");

    if (quantity !== undefined) await fireEvent.changeText(quantityInput, quantity);
    if (unit !== undefined) await fireEvent.changeText(unitInput, unit);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(
      RECIPE_ID,
      expect.objectContaining({
        base_servings: expectedQuantity,
        servings_unit: expectedUnit,
      }),
    );
  });

  it.each([
    { label: "untouched", input: undefined, expected: "https://example.com/original.jpg" },
    {
      label: "edited",
      input: "  https://example.com/replacement.jpg  ",
      expected: "https://example.com/replacement.jpg",
    },
    { label: "cleared", input: "  ", expected: null },
  ])("prefills and submits the saved image URL: $label", async ({ input, expected }) => {
    const originalUrl = "https://example.com/original.jpg";
    const imageInputLabel = "Image URL (optional)";
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, image_url: originalUrl });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, image_url: expected });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);
    const onSaved = jest.fn();

    await renderScreen(onSaved);

    const imageInput = await screen.findByLabelText(imageInputLabel);
    expect(imageInput).toHaveDisplayValue(originalUrl);

    if (input !== undefined) await fireEvent.changeText(imageInput, input);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, expect.objectContaining({ image_url: expected }));
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });

  it.each([
    { label: "preserve favorite", initial: true, selected: undefined, expected: true },
    { label: "preserve nonfavorite", initial: false, selected: undefined, expected: false },
    { label: "add favorite", initial: false, selected: true, expected: true },
    { label: "remove favorite", initial: true, selected: false, expected: false },
  ])("prefills and submits favorite status: $label", async ({ initial, selected, expected }) => {
    const recipe = makeRecipeDetailResponse({ id: RECIPE_ID, is_favorite: initial });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, is_favorite: expected });
    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);
    const onSaved = jest.fn();

    await renderScreen(onSaved);
    const favoriteSwitch = await screen.findByRole("switch", { name: "Favorite" });
    expect(favoriteSwitch).toHaveProp("value", initial);
    if (selected !== undefined) await fireEvent(favoriteSwitch, "valueChange", selected);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_CHANGES_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, expect.objectContaining({ is_favorite: expected }));
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });
});

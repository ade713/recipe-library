import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { RecipeCreateForm } from "../recipe-create-form";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const INGREDIENT_1 = "2 cups flour";
const INGREDIENT_2 = "1 cup milk";
const INGREDIENT_INPUT_LABEL_1 = "Ingredient 1";
const INGREDIENT_INPUT_LABEL_2 = "Ingredient 2";
const NETWORK_ERROR_MESSAGE = "Network failure";
const RECIPE_TITLE = "Chicken Soup";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const TITLE_INPUT_LABEL = "Recipe title";

const renderRecipeCreateForm = async (onSubmit: () => Promise<void>) => {
  await render(<RecipeCreateForm onSubmit={onSubmit} />);
};

describe("RecipeCreateForm", () => {
  it("submits the entered recipe title", async () => {
    const onSubmit = jest.fn();

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.press(await screen.findByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({ title: RECIPE_TITLE, ingredients: [] });
  });

  it.each(["", "   "])("rejects a blank recipe title: %p", async (title) => {
    const onSubmit = jest.fn();

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), title);
    await fireEvent.press(await screen.findByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(await screen.findByText(ENTER_TITLE_ERROR_MESSAGE)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the validation error when a valid title is submitted", async () => {
    const onSubmit = jest.fn();

    await renderRecipeCreateForm(onSubmit);

    const saveButton = await screen.findByRole("button", { name: SAVE_BUTTON_LABEL });
    await fireEvent.press(saveButton);
    await screen.findByText(ENTER_TITLE_ERROR_MESSAGE);
    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledWith({ title: RECIPE_TITLE, ingredients: [] });
    expect(screen.queryByText(ENTER_TITLE_ERROR_MESSAGE)).toBeNull();
  });

  it("prevents another submission while saving", async () => {
    const onSubmit = jest.fn(() => new Promise<void>(() => {}));

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    const saveButton = await screen.findByRole("button", { name: SAVE_BUTTON_LABEL });
    void fireEvent.press(saveButton);

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });

    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows feedback and allows retry when saving fails", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    const onSubmit = jest.fn().mockRejectedValue(error);

    await renderRecipeCreateForm(onSubmit);

    const titleInput = await screen.findByLabelText(TITLE_INPUT_LABEL);
    await fireEvent.changeText(titleInput, RECIPE_TITLE);
    const saveButton = await screen.findByRole("button", { name: SAVE_BUTTON_LABEL });
    await fireEvent.press(saveButton);

    await screen.findByText(SAVE_RECIPE_ERROR_MESSAGE);

    expect(saveButton).toBeEnabled();
    expect(titleInput).toHaveDisplayValue(RECIPE_TITLE);
  });

  it("clears the save error after a successful retry", async () => {
    const error = new Error(NETWORK_ERROR_MESSAGE);

    const onSubmit = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1), INGREDIENT_1);
    const saveButton = await screen.findByRole("button", { name: SAVE_BUTTON_LABEL });
    await fireEvent.press(saveButton);
    await screen.findByText(SAVE_RECIPE_ERROR_MESSAGE);

    expect(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1)).toHaveDisplayValue(INGREDIENT_1);
    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenLastCalledWith({
      title: RECIPE_TITLE,
      ingredients: [{ position: 1, original_text: INGREDIENT_1 }],
    });
    expect(screen.queryByText(SAVE_RECIPE_ERROR_MESSAGE)).toBeNull();
    expect(saveButton).toBeEnabled();
  });

  it("submits added ingredients in their entered order", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1), INGREDIENT_1);
    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_2), INGREDIENT_2);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [
        { position: 1, original_text: INGREDIENT_1 },
        { position: 2, original_text: INGREDIENT_2 },
      ],
    });
  });

  it("trims ingredient text and skips blank rows with consecutive positions", async () => {
    const ingredientInputLabel3 = "Ingredient 3";
    const ingredientInputLabel4 = "Ingredient 4";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1), `   ${INGREDIENT_1}  `);
    const addIngredientButton = screen.getByRole("button", { name: ADD_INGREDIENT_LABEL });
    await fireEvent.press(addIngredientButton);
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_2), "   ");
    await fireEvent.press(addIngredientButton);
    await fireEvent.changeText(screen.getByLabelText(ingredientInputLabel3), "");
    await fireEvent.press(addIngredientButton);
    await fireEvent.changeText(screen.getByLabelText(ingredientInputLabel4), ` ${INGREDIENT_2} `);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [
        { position: 1, original_text: INGREDIENT_1 },
        { position: 2, original_text: INGREDIENT_2 },
      ],
    });
  });

  it("removes an ingredient and submits the remaining entries in order", async () => {
    const ingredient1 = "Flour";
    const ingredient2 = "Milk";
    const ingredient3 = "Salt";
    const ingredientInputLabel3 = "Ingredient 3";
    const removeIngredientLabel = "Remove ingredient 2";
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1), ingredient1);
    const addIngredientButton = screen.getByRole("button", { name: ADD_INGREDIENT_LABEL });
    await fireEvent.press(addIngredientButton);
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_2), ingredient2);
    await fireEvent.press(addIngredientButton);
    await fireEvent.changeText(screen.getByLabelText(ingredientInputLabel3), ingredient3);

    await fireEvent.press(screen.getByRole("button", { name: removeIngredientLabel }));

    expect(screen.getByLabelText(INGREDIENT_INPUT_LABEL_2)).toHaveDisplayValue(ingredient3);
    expect(screen.queryByLabelText(ingredientInputLabel3)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [
        { position: 1, original_text: ingredient1 },
        { position: 2, original_text: ingredient3 },
      ],
    });
  });

  it("allows adding an ingredient after removing every row", async () => {
    const removeIngredientLabel = "Remove ingredient 1";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: removeIngredientLabel }));

    expect(screen.queryByLabelText(INGREDIENT_INPUT_LABEL_1)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1), INGREDIENT_1);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [{ position: 1, original_text: INGREDIENT_1 }],
    });
  });
});

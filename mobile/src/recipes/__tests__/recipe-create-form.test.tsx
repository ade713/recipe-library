import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { RecipeCreateForm } from "../recipe-create-form";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ADD_STEP_LABEL = "Add step";
const ADD_TIP_LABEL = "Add tip";
const COOK_TIME_LABEL = "Cook time (minutes)";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const INGREDIENT_1 = "2 cups flour";
const INGREDIENT_2 = "1 cup milk";
const INGREDIENT_INPUT_LABEL_1 = "Ingredient 1";
const INGREDIENT_INPUT_LABEL_2 = "Ingredient 2";
const INVALID_SERVINGS_MESSAGE = "Enter a servings or yield quantity of zero or greater.";
const INVALID_TIME_MESSAGE = "Enter times as whole minutes, zero or greater.";
const NETWORK_ERROR_MESSAGE = "Network failure";
const PREP_TIME_LABEL = "Prep time (minutes)";
const RECIPE_TITLE = "Chicken Soup";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const SERVINGS_LABEL = "Servings or yield quantity";
const SERVINGS_UNIT_LABEL = "Yield unit (optional)";
const STEP_1 = "Mix the ingredients.";
const STEP_2 = "Bake for 20 minutes.";
const STEP_LABEL_1 = "Step 1";
const STEP_LABEL_2 = "Step 2";
const TIP_1 = "Use room-temperature ingredients.";
const TIP_2 = "Let it cool before serving.";
const TIP_LABEL_1 = "Tip 1";
const TIP_LABEL_2 = "Tip 2";
const TITLE_INPUT_LABEL = "Recipe title";
const TOTAL_TIME_LABEL = "Total time (minutes)";

const renderRecipeCreateForm = async (onSubmit: () => Promise<void>) => {
  await render(<RecipeCreateForm onSubmit={onSubmit} />);
};

describe("RecipeCreateForm", () => {
  it("submits the entered recipe title", async () => {
    const onSubmit = jest.fn();

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.press(await screen.findByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [],
    });
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

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [],
    });
    expect(screen.queryByText(ENTER_TITLE_ERROR_MESSAGE)).toBeNull();
  });

  it("submits numeric times and preserves an independently entered total", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(PREP_TIME_LABEL), " 10 ");
    await fireEvent.changeText(screen.getByLabelText(COOK_TIME_LABEL), "0");
    await fireEvent.changeText(screen.getByLabelText(TOTAL_TIME_LABEL), "30");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [],
      prep_time_minutes: 10,
      cook_time_minutes: 0,
      total_time_minutes: 30,
    });
  });

  it("leaves blank times unspecified instead of converting them to zero", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(PREP_TIME_LABEL), "   ");
    await fireEvent.changeText(screen.getByLabelText(COOK_TIME_LABEL), "15");
    await fireEvent.changeText(screen.getByLabelText(COOK_TIME_LABEL), "");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [],
    });
  });

  describe.each([PREP_TIME_LABEL, COOK_TIME_LABEL, TOTAL_TIME_LABEL])("%s validation", (label) => {
    it.each(["-1", "1.5", "10 minutes"])("rejects %p and allows correction", async (invalidValue) => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      await renderRecipeCreateForm(onSubmit);

      await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
      await fireEvent.changeText(screen.getByLabelText(label), invalidValue);
      const saveButton = screen.getByRole("button", { name: SAVE_BUTTON_LABEL });
      await fireEvent.press(saveButton);

      expect(screen.getByText(INVALID_TIME_MESSAGE)).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(saveButton).toBeEnabled();

      await fireEvent.changeText(screen.getByLabelText(label), "5");
      await fireEvent.press(saveButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(INVALID_TIME_MESSAGE)).toBeNull();
    });
  });

  it.each([
    [" 1.5 ", " loaves ", 1.5, "loaves"],
    ["0", "", 0, undefined],
    ["4", "   ", 4, undefined],
    ["   ", "", undefined, undefined],
  ])("submits quantity %p and unit %p", async (quantity, unit, expectedQuantity, expectedUnit) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(SERVINGS_LABEL), quantity);
    await fireEvent.changeText(screen.getByLabelText(SERVINGS_UNIT_LABEL), unit);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [],
      base_servings: expectedQuantity,
      servings_unit: expectedUnit,
    });
  });

  it.each(["-1", "two", "Infinity", "NaN"])("rejects yield quantity %p and allows correction", async (quantity) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(SERVINGS_LABEL), quantity);
    const saveButton = screen.getByRole("button", { name: SAVE_BUTTON_LABEL });
    await fireEvent.press(saveButton);

    expect(screen.getByText(INVALID_SERVINGS_MESSAGE)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(saveButton).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText(SERVINGS_LABEL), "2.5");
    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ base_servings: 2.5 }));
    expect(screen.queryByText(INVALID_SERVINGS_MESSAGE)).toBeNull();
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
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), STEP_1);
    await fireEvent.changeText(screen.getByLabelText(TIP_LABEL_1), TIP_1);
    await fireEvent.changeText(screen.getByLabelText(PREP_TIME_LABEL), "10");
    await fireEvent.changeText(screen.getByLabelText(COOK_TIME_LABEL), "20");
    await fireEvent.changeText(screen.getByLabelText(TOTAL_TIME_LABEL), "40");
    await fireEvent.changeText(screen.getByLabelText(SERVINGS_LABEL), "1.5");
    await fireEvent.changeText(screen.getByLabelText(SERVINGS_UNIT_LABEL), "loaves");
    const saveButton = await screen.findByRole("button", { name: SAVE_BUTTON_LABEL });
    await fireEvent.press(saveButton);
    await screen.findByText(SAVE_RECIPE_ERROR_MESSAGE);

    expect(screen.getByLabelText(INGREDIENT_INPUT_LABEL_1)).toHaveDisplayValue(INGREDIENT_1);
    expect(screen.getByLabelText(STEP_LABEL_1)).toHaveDisplayValue(STEP_1);
    expect(screen.getByLabelText(TIP_LABEL_1)).toHaveDisplayValue(TIP_1);
    expect(screen.getByLabelText(PREP_TIME_LABEL)).toHaveDisplayValue("10");
    expect(screen.getByLabelText(COOK_TIME_LABEL)).toHaveDisplayValue("20");
    expect(screen.getByLabelText(TOTAL_TIME_LABEL)).toHaveDisplayValue("40");
    expect(screen.getByLabelText(SERVINGS_LABEL)).toHaveDisplayValue("1.5");
    expect(screen.getByLabelText(SERVINGS_UNIT_LABEL)).toHaveDisplayValue("loaves");
    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenLastCalledWith({
      title: RECIPE_TITLE,
      ingredients: [{ position: 1, original_text: INGREDIENT_1 }],
      steps: [{ position: 1, instruction: STEP_1 }],
      tips: [{ position: 1, tip: TIP_1 }],
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      total_time_minutes: 40,
      base_servings: 1.5,
      servings_unit: "loaves",
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
      steps: [],
      tips: [],
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
      steps: [],
      tips: [],
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
      steps: [],
      tips: [],
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
      steps: [],
      tips: [],
    });
  });

  it("submits added steps in their entered order", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), STEP_1);
    await fireEvent.press(screen.getByRole("button", { name: ADD_STEP_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_2), STEP_2);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [
        { position: 1, instruction: STEP_1 },
        { position: 2, instruction: STEP_2 },
      ],
      tips: [],
    });
  });

  it("trims steps and skips blank rows while preserving instruction line breaks", async () => {
    const multilineStep = `${STEP_1}\nStir until smooth.`;
    const stepLabel3 = "Step 3";
    const stepLabel4 = "Step 4";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), `  ${multilineStep}  `);
    const addStepButton = screen.getByRole("button", { name: ADD_STEP_LABEL });
    await fireEvent.press(addStepButton);
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_2), "   ");
    await fireEvent.press(addStepButton);
    await fireEvent.changeText(screen.getByLabelText(stepLabel3), "");
    await fireEvent.press(addStepButton);
    await fireEvent.changeText(screen.getByLabelText(stepLabel4), `  ${STEP_2}   `);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [
        { position: 1, instruction: multilineStep },
        { position: 2, instruction: STEP_2 },
      ],
      tips: [],
    });
  });

  it("removes a step and submits the remaining instructions in order", async () => {
    const step1 = "Mix.";
    const step2 = "Rest.";
    const step3 = "Bake.";
    const stepLabel3 = "Step 3";
    const removeStepLabel = "Remove step 2";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), step1);
    const addStepButton = screen.getByRole("button", { name: ADD_STEP_LABEL });
    await fireEvent.press(addStepButton);
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_2), step2);
    await fireEvent.press(addStepButton);
    await fireEvent.changeText(screen.getByLabelText(stepLabel3), step3);

    await fireEvent.press(screen.getByRole("button", { name: removeStepLabel }));

    expect(screen.getByLabelText(STEP_LABEL_2)).toHaveDisplayValue(step3);
    expect(screen.queryByLabelText(stepLabel3)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [
        { position: 1, instruction: step1 },
        { position: 2, instruction: step3 },
      ],
      tips: [],
    });
  });

  it("allows adding a step after removing every row", async () => {
    const removeStepLabel = "Remove step 1";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: removeStepLabel }));

    expect(screen.queryByLabelText(STEP_LABEL_1)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: ADD_STEP_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), STEP_2);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [{ position: 1, instruction: STEP_2 }],
      tips: [],
    });
  });

  it.each([
    [ADD_INGREDIENT_LABEL, INGREDIENT_INPUT_LABEL_2],
    [ADD_STEP_LABEL, STEP_LABEL_2],
    [ADD_TIP_LABEL, TIP_LABEL_2],
  ])("requests autofocus after press %s", async (buttonName, inputLabel) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.press(screen.getByRole("button", { name: buttonName }));

    expect(screen.getByLabelText(inputLabel).props.autoFocus).toBe(true);
  });

  it("submits added tips in their entered order", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(TIP_LABEL_1), TIP_1);
    await fireEvent.press(screen.getByRole("button", { name: ADD_TIP_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(TIP_LABEL_2), TIP_2);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [
        { position: 1, tip: TIP_1 },
        { position: 2, tip: TIP_2 },
      ],
    });
  });

  it("trims tips and skips blank rows while preserving line breaks", async () => {
    const multilineTip = "Use fresh herbs.\nAdd them at the end.";
    const tip = "Serve warm.";
    const tipLabel3 = "Tip 3";
    const tipLabel4 = "Tip 4";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.changeText(screen.getByLabelText(TIP_LABEL_1), `   ${multilineTip}  `);
    const addTipButton = screen.getByRole("button", { name: ADD_TIP_LABEL });
    await fireEvent.press(addTipButton);
    await fireEvent.changeText(screen.getByLabelText(TIP_LABEL_2), "    ");
    await fireEvent.press(addTipButton);
    await fireEvent.changeText(screen.getByLabelText(tipLabel3), "");
    await fireEvent.press(addTipButton);
    await fireEvent.changeText(screen.getByLabelText(tipLabel4), `  ${tip} `);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: RECIPE_TITLE,
      ingredients: [],
      steps: [],
      tips: [
        { position: 1, tip: multilineTip },
        { position: 2, tip: tip },
      ],
    });
  });
});

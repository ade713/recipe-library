import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { RecipeIngredient } from "@/types/recipe";

import { RecipeEditForm } from "../recipe-edit-form";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const INGREDIENT_LABEL_1 = "Ingredient 1";
const REMOVE_INGREDIENT_LABEL_1 = "Remove ingredient 1";

const SAVED: RecipeIngredient = {
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
};
const SECOND: RecipeIngredient = {
  ...SAVED,
  position: 2,
  original_text: "1 cup peas",
  quantity: "1.00",
  quantity_text: "1",
  name: "peas",
  preparation_note: null,
};

const renderForm = async (initialIngredients = [SAVED]) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  await render(<RecipeEditForm initialTitle='Soup' initialIngredients={initialIngredients} onSubmit={onSubmit} />);

  return onSubmit;
};
const save = async () => {
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
};

describe("RecipeEditForm ingredients", () => {
  it("locks ingredient controls while saving and preserves the draft and snapshot for retry", async () => {
    const editedText = "  3 cups carrots  ";
    const newText = "  Salt to taste  ";
    const secondLabel = "Ingredient 2";
    const removeSecondLabel = "Remove ingredient 2";
    const saveLabel = "Save changes";
    const saveErrorMessage = "Unable to save changes. Please try again.";

    let rejectSave!: (error: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });
    const onSubmit = jest.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);

    await render(<RecipeEditForm initialTitle='Soup' initialIngredients={[SAVED]} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), editedText);
    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(secondLabel), newText);

    await save();
    try {
      expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toBeDisabled();
      expect(screen.getByLabelText(secondLabel)).toBeDisabled();
      expect(screen.getByRole("button", { name: REMOVE_INGREDIENT_LABEL_1 })).toBeDisabled();
      expect(screen.getByRole("button", { name: removeSecondLabel })).toBeDisabled();
      expect(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL })).toBeDisabled();
      expect(screen.getByRole("button", { name: saveLabel })).toBeDisabled();
    } finally {
      await act(async () => {
        rejectSave(new Error("Network failure"));
      });
    }

    expect(screen.getByText(saveErrorMessage)).toBeTruthy();
    expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toHaveDisplayValue(editedText);
    expect(screen.getByLabelText(secondLabel)).toHaveDisplayValue(newText);
    expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toBeEnabled();
    expect(screen.getByLabelText(secondLabel)).toBeEnabled();
    expect(screen.getByRole("button", { name: REMOVE_INGREDIENT_LABEL_1 })).toBeEnabled();
    expect(screen.getByRole("button", { name: removeSecondLabel })).toBeEnabled();
    expect(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: saveLabel })).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), SAVED.original_text);
    await save();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ingredients: [
          SAVED,
          {
            position: 2,
            original_text: newText.trim(),
            quantity: null,
            quantity_text: null,
            unit: null,
            name: null,
            preparation_note: null,
            is_optional: false,
            scale_locked: false,
            parse_status: "unparsed",
          },
        ],
      }),
    );
    expect(screen.queryByText(saveErrorMessage)).toBeNull();
  });

  it("prefills saved text and preserves metadata during a title-only edit", async () => {
    const title = "Carrot soup";
    const titleLabel = "Recipe title";

    const onSubmit = await renderForm();

    expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toHaveDisplayValue(SAVED.original_text);
    await fireEvent.changeText(screen.getByLabelText(titleLabel), title);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title,
        ingredients: [SAVED],
      }),
    );
  });

  it("preserves entered text until submission and resets stale parsing while retaining flags", async () => {
    const text = "  3 cups sliced carrots  ";

    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), text);
    expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toHaveDisplayValue(text);

    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredients: [
          {
            position: 1,
            original_text: text.trim(),
            quantity: null,
            quantity_text: null,
            unit: null,
            name: null,
            preparation_note: null,
            is_optional: true,
            scale_locked: true,
            parse_status: "unparsed",
          },
        ],
      }),
    );
  });

  it("retains the saved snapshot when text is edited and then restored", async () => {
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), "Something else");
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), SAVED.original_text);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ingredients: [SAVED] }));
  });

  it("keeps remaining row metadata through removals and new rows", async () => {
    const ingredientLabel2 = "Ingredient 2";
    const removeIngredientLabel2 = "Remove ingredient 2";
    const saltIngredient = "Salt to taste";
    const discardIngredient = "Discard this";

    const onSubmit = await renderForm([SAVED, SECOND]);

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_INGREDIENT_LABEL_1 }));
    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(ingredientLabel2), discardIngredient);
    await fireEvent.press(screen.getByRole("button", { name: removeIngredientLabel2 }));
    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toHaveDisplayValue(SECOND.original_text);
    expect(screen.getByLabelText(ingredientLabel2)).toHaveDisplayValue("");

    await fireEvent.changeText(screen.getByLabelText(ingredientLabel2), saltIngredient);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredients: [
          { ...SECOND, position: 1 },
          {
            position: 2,
            original_text: saltIngredient,
            quantity: null,
            quantity_text: null,
            unit: null,
            name: null,
            preparation_note: null,
            is_optional: false,
            scale_locked: false,
            parse_status: "unparsed",
          },
        ],
      }),
    );
  });

  it("omits blank rows before numbering remaining ingredients", async () => {
    const onSubmit = await renderForm([SAVED, SECOND]);

    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), " \n ");
    await save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ingredients: [{ ...SECOND, position: 1 }] }));
  });

  it("clears all ingredients and allows adding again", async () => {
    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_INGREDIENT_LABEL_1 }));
    await save();
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ ingredients: [] }));

    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    expect(screen.getByLabelText(INGREDIENT_LABEL_1)).toHaveDisplayValue("");
  });

  it("allows adding to a recipe without saved ingredients", async () => {
    const ingredient = "Salt";

    const onSubmit = await renderForm([]);

    expect(screen.queryByLabelText(INGREDIENT_LABEL_1)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: ADD_INGREDIENT_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(INGREDIENT_LABEL_1), ingredient);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        ingredients: [
          expect.objectContaining({
            position: 1,
            original_text: ingredient,
            parse_status: "unparsed",
          }),
        ],
      }),
    );
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { RecipeCreateForm } from "../recipe-create-form";

const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const NETWORK_ERROR_MESSAGE = "Network failure";
const SAVE_BUTTON_LABEL = "Save recipe";
const TITLE_INPUT_LABEL = "Recipe title";
const RECIPE_TITLE = "Chicken Soup";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";

const renderRecipeCreateForm = async (onSubmit: () => Promise<void>) => {
  await render(<RecipeCreateForm onSubmit={onSubmit} />);
};

describe("RecipeCreateForm", () => {
  it("submits the entered recipe title", async () => {
    const onSubmit = jest.fn();

    await renderRecipeCreateForm(onSubmit);

    await fireEvent.changeText(await screen.findByLabelText(TITLE_INPUT_LABEL), RECIPE_TITLE);
    await fireEvent.press(await screen.findByRole("button", { name: SAVE_BUTTON_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith({ title: RECIPE_TITLE });
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

    expect(onSubmit).toHaveBeenCalledWith({ title: RECIPE_TITLE });
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
    const saveButton = await screen.findByRole("button", { name: SAVE_BUTTON_LABEL });
    await fireEvent.press(saveButton);
    await screen.findByText(SAVE_RECIPE_ERROR_MESSAGE);
    await fireEvent.press(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenLastCalledWith({ title: RECIPE_TITLE });
    expect(screen.queryByText(SAVE_RECIPE_ERROR_MESSAGE)).toBeNull();
    expect(saveButton).toBeEnabled();
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { RecipeEditForm } from "../recipe-edit-form";

const FAVORITE_LABEL = "Favorite";
const SAVE_LABEL = "Save changes";
const SAVE_ERROR = "Unable to save changes. Please try again.";

const renderForm = async (initialIsFavorite?: boolean, onSubmit = jest.fn().mockResolvedValue(undefined)) => {
  await render(<RecipeEditForm initialTitle='Bread' initialIsFavorite={initialIsFavorite} onSubmit={onSubmit} />);
  return onSubmit;
};

const favoriteSwitch = () => screen.getByRole("switch", { name: FAVORITE_LABEL });
const saveButton = () => screen.getByRole("button", { name: SAVE_LABEL });

describe("RecipeEditForm favorite", () => {
  it.each([true, false])("prefills and preserves untouched favorite status: %p", async (initial) => {
    const onSubmit = await renderForm(initial);

    expect(favoriteSwitch()).toHaveProp("value", initial);

    await fireEvent.press(saveButton());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ is_favorite: initial }));
  });

  it("defaults an omitted initial favorite to false", async () => {
    const onSubmit = await renderForm();

    expect(favoriteSwitch()).toHaveProp("value", false);

    await fireEvent.press(saveButton());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ is_favorite: false }));
  });

  it.each([true, false])("submits the changed favorite status explicitly: %p", async (selected) => {
    const onSubmit = await renderForm(!selected);

    await fireEvent(favoriteSwitch(), "valueChange", selected);
    expect(favoriteSwitch()).toHaveProp("value", selected);

    await fireEvent.press(saveButton());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ is_favorite: selected }));
  });

  it("disables the switch during saving and preserves the selection after failure for retry", async () => {
    const networkErrorMessage = "Network failure";
    let rejectSave!: (error: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });

    const onSubmit = jest.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);

    await renderForm(true, onSubmit);
    await fireEvent(favoriteSwitch(), "valueChange", false);

    await fireEvent.press(saveButton());
    expect(favoriteSwitch()).toHaveProp("disabled", true);
    expect(saveButton()).toBeDisabled();

    await act(async () => {
      rejectSave(new Error(networkErrorMessage));
    });
    expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    expect(favoriteSwitch()).toHaveProp("value", false);
    expect(favoriteSwitch()).toHaveProp("disabled", false);

    await fireEvent.press(saveButton());
    expect(onSubmit).toHaveBeenNthCalledWith(2, expect.objectContaining({ is_favorite: false }));
    expect(screen.queryByText(SAVE_ERROR)).toBeNull();
  });
});

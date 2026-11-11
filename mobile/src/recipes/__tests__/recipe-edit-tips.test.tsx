import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { RecipeTip } from "@/types/recipe";

import { RecipeEditForm } from "../recipe-edit-form";

const ADD_TIP_LABEL = "Add tip";
const TIP_1_LABEL = "Tip 1";
const TIP_2_LABEL = "Tip 2";
const REMOVE_TIP_1_LABEL = "Remove tip 1";
const REMOVE_TIP_2_LABEL = "Remove tip 2";
const SAVE_LABEL = "Save changes";

const TIP_1 = { position: 1, tip: "Use fresh herbs" };
const TIP_2 = { position: 2, tip: "Serve warm" };
const TIPS: RecipeTip[] = [TIP_1, TIP_2];

const renderForm = async (initialTips = TIPS) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  await render(<RecipeEditForm initialTitle='Soup' initialTips={initialTips} onSubmit={onSubmit} />);
  return onSubmit;
};
const save = async () => {
  await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
};

describe("RecipeEditForm tips", () => {
  it("disables tip controls while saving and preserves the draft after failure for retry", async () => {
    const editedTip = "  Serve warm.\nAdd herbs.  ";
    const newTip = "Freeze leftovers";
    const correctedTip = "Freeze in small portions";
    const saveErrorMessage = "Unable to save changes. Please try again.";
    const networkErrorMessage = "Network failure";

    let rejectSave!: (error: Error) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });
    const onSubmit = jest.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(undefined);

    await render(<RecipeEditForm initialTitle='Soup' initialTips={TIPS} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_TIP_1_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(TIP_1_LABEL), editedTip);
    await fireEvent.press(screen.getByRole("button", { name: ADD_TIP_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(TIP_2_LABEL), newTip);

    await save();
    try {
      expect(screen.getByLabelText(TIP_1_LABEL)).toBeDisabled();
      expect(screen.getByLabelText(TIP_2_LABEL)).toBeDisabled();
      expect(screen.getByRole("button", { name: REMOVE_TIP_1_LABEL })).toBeDisabled();
      expect(screen.getByRole("button", { name: REMOVE_TIP_2_LABEL })).toBeDisabled();
      expect(screen.getByRole("button", { name: ADD_TIP_LABEL })).toBeDisabled();
      expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeDisabled();
    } finally {
      await act(async () => {
        rejectSave(new Error(networkErrorMessage));
      });
    }

    expect(screen.getByText(saveErrorMessage)).toBeTruthy();
    expect(screen.getByLabelText(TIP_1_LABEL)).toHaveDisplayValue(editedTip);
    expect(screen.getByLabelText(TIP_2_LABEL)).toHaveDisplayValue(newTip);
    expect(screen.getByLabelText(TIP_1_LABEL)).toBeEnabled();
    expect(screen.getByLabelText(TIP_2_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: REMOVE_TIP_1_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: REMOVE_TIP_2_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: ADD_TIP_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText(TIP_2_LABEL), correctedTip);
    await save();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onSubmit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tips: [
          { position: 1, tip: editedTip.trim() },
          { position: 2, tip: correctedTip },
        ],
      }),
    );
    expect(screen.queryByText(saveErrorMessage)).toBeNull();
  });

  it("prefills saved tips and preserves them when untouched", async () => {
    const onSubmit = await renderForm();

    expect(screen.getByLabelText(TIP_1_LABEL)).toHaveDisplayValue(TIP_1.tip);
    expect(screen.getByLabelText(TIP_2_LABEL)).toHaveDisplayValue(TIP_2.tip);

    await save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tips: TIPS }));
  });

  it("preserves entered text, then trims and filters before numbering submitted tips", async () => {
    const editedTip = "  Serve warm.\nAdd herbs.  ";

    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(TIP_1_LABEL), " \n ");
    await fireEvent.changeText(screen.getByLabelText(TIP_2_LABEL), editedTip);
    expect(screen.getByLabelText(TIP_2_LABEL)).toHaveDisplayValue(editedTip);

    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        tips: [{ position: 1, tip: editedTip.trim() }],
      }),
    );
  });

  it("removes saved and new rows without mixing up the remaining tip", async () => {
    const discardTip = "Discard this";
    const freezeTip = "Freeze leftovers";
    const emptyTip = "";

    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_TIP_1_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: ADD_TIP_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(TIP_2_LABEL), discardTip);
    await fireEvent.press(screen.getByRole("button", { name: REMOVE_TIP_2_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: ADD_TIP_LABEL }));
    expect(screen.getByLabelText(TIP_1_LABEL)).toHaveDisplayValue(TIP_2.tip);
    expect(screen.getByLabelText(TIP_2_LABEL)).toHaveDisplayValue(emptyTip);

    await fireEvent.changeText(screen.getByLabelText(TIP_2_LABEL), freezeTip);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        tips: [
          { position: 1, tip: TIP_2.tip },
          { position: 2, tip: freezeTip },
        ],
      }),
    );
  });

  it("clears all saved tips with an empty array", async () => {
    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_TIP_1_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: REMOVE_TIP_1_LABEL }));
    expect(screen.queryByLabelText(TIP_1_LABEL)).toBeNull();

    await save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tips: [] }));
  });

  it("adds a tip when no saved tips exist", async () => {
    const newTip = "Chill before serving";

    const onSubmit = await renderForm([]);

    expect(screen.queryByLabelText(TIP_1_LABEL)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: ADD_TIP_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(TIP_1_LABEL), newTip);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        tips: [{ position: 1, tip: newTip }],
      }),
    );
  });
});

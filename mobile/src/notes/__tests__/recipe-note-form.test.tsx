import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { RecipeNoteForm } from "../recipe-note-form";

const INPUT_LABEL = "Personal note";
const SUBMIT_LABEL = "Add note";
const VALIDATION_MESSAGE = "Enter a note.";
const SAVE_ERROR_MESSAGE = "Unable to add note. Please try again.";

const renderRecipeNoteForm = async (onSubmit: (note: string) => Promise<void>) => {
  await render(<RecipeNoteForm onSubmit={onSubmit} />);
};

describe("RecipeNoteForm", () => {
  it("disables input and repeated submission while pending, then clears text after success", async () => {
    const noteText = "  Use less salt.  ";

    let resolveSave!: () => void;
    const onSubmit = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), noteText);
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));

    try {
      expect(screen.getByLabelText(INPUT_LABEL)).toBeDisabled();
      expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(noteText);
      expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeDisabled();
      await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        resolveSave();
      });
    }

    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("");
    expect(screen.getByLabelText(INPUT_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
  });

  it("preserves original text after failure and clears feedback while retrying", async () => {
    const noteText = "  Double the sauce.\nLess salt.  ";
    const privateMessage = "Private save failure";

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(privateMessage));

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), noteText);
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));

    expect(await screen.findByText(SAVE_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateMessage)).toBeNull();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(noteText);
    expect(screen.getByLabelText(INPUT_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();

    let resolveRetry!: () => void;
    onSubmit.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRetry = resolve;
      }),
    );
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    try {
      expect(screen.queryByText(SAVE_ERROR_MESSAGE)).toBeNull();
      expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(noteText);
      expect(onSubmit).toHaveBeenNthCalledWith(2, noteText.trim());
    } finally {
      await act(async () => {
        resolveRetry();
      });
    }

    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("");
    expect(screen.queryByText(SAVE_ERROR_MESSAGE)).toBeNull();
  });

  it("clears request feedback when the user changes the note", async () => {
    const unavailableErrorMessage = "Unavailable";

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(unavailableErrorMessage));

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), "Less salt.");
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    expect(await screen.findByText(SAVE_ERROR_MESSAGE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), "More paprika.");
    expect(screen.queryByText(SAVE_ERROR_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("More paprika.");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("starts with an empty multiline input and no error", async () => {
    const onSubmit = jest.fn();

    await renderRecipeNoteForm(onSubmit);

    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("");
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveProp("multiline", true);
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
    expect(screen.queryByText(VALIDATION_MESSAGE)).toBeNull();
  });

  it.each(["", "   ", " \n\t "])("rejects blank input without submitting: %p", async (noteText) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), noteText);
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));

    expect(screen.getByText(VALIDATION_MESSAGE)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(noteText);
    expect(screen.getByLabelText(INPUT_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
  });

  it("preserves typed whitespace and submits trimmed text with internal line breaks", async () => {
    const noteText = "  Use less salt.\nDouble the sauce.  ";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), noteText);
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(noteText);

    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(noteText.trim());
  });

  it("clears validation feedback when the input is corrected and allows submission", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    expect(screen.getByText(VALIDATION_MESSAGE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), "Try smoked paprika.");
    expect(screen.queryByText(VALIDATION_MESSAGE)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith("Try smoked paprika.");
  });
});

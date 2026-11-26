import { fireEvent, render, screen } from "@testing-library/react-native";

import { RecipeNoteForm } from "../recipe-note-form";

const INPUT_LABEL = "Personal note";
const SUBMIT_LABEL = "Add note";
const VALIDATION_MESSAGE = "Enter a note.";

const renderRecipeNoteForm = async (onSubmit: (note: string) => Promise<void>) => {
  await render(<RecipeNoteForm onSubmit={onSubmit} />);
};

describe("RecipeNoteForm", () => {
  it("starts with an empty multiline input and no error", async () => {
    const onSubmit = jest.fn();

    await renderRecipeNoteForm(onSubmit);

    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue("");
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveProp("multiline", true);
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
    expect(screen.queryByText(VALIDATION_MESSAGE)).toBeNull();
  });

  it.each(["", "   ", " \n\t "])("rejects blank input without submitting: %p", async (value) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), value);
    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));

    expect(screen.getByText(VALIDATION_MESSAGE)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(value);
    expect(screen.getByLabelText(INPUT_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: SUBMIT_LABEL })).toBeEnabled();
  });

  it("preserves typed whitespace and submits trimmed text with internal line breaks", async () => {
    const value = "  Use less salt.\nDouble the sauce.  ";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderRecipeNoteForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(INPUT_LABEL), value);
    expect(screen.getByLabelText(INPUT_LABEL)).toHaveDisplayValue(value);

    await fireEvent.press(screen.getByRole("button", { name: SUBMIT_LABEL }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(value.trim());
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

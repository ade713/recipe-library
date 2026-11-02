import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { RecipeTitleEditForm } from "../recipe-title-edit-form";

const TITLE_BLANK_ERROR = "Enter a recipe title.";
const INITIAL_TITLE = "Chicken Soup";
const TITLE_LENGTH_ERROR = "Recipe titles must be 255 characters or fewer.";
const SAVE_ERROR = "Unable to save changes. Please try again.";
const SAVE_LABEL = "Save changes";
const TITLE_LABEL = "Recipe title";

const renderForm = async (onSubmit: (values: { title: string }) => Promise<void>) => {
  await render(<RecipeTitleEditForm initialTitle={INITIAL_TITLE} onSubmit={onSubmit} />);
};

describe("RecipeTitleEditForm", () => {
  it("prefills the title and submits only the trimmed edited title", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderForm(onSubmit);

    const input = screen.getByLabelText(TITLE_LABEL);
    expect(input).toHaveDisplayValue(INITIAL_TITLE);

    await fireEvent.changeText(input, "  Updated soup  ");
    expect(input).toHaveDisplayValue("  Updated soup  ");

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith({ title: "Updated soup" });
  });

  it.each(["", "   "])("rejects a blank title and allows correction: %p", async (title) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), title);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(screen.getByText(TITLE_BLANK_ERROR)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), INITIAL_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith({ title: INITIAL_TITLE });
    expect(screen.queryByText(TITLE_BLANK_ERROR)).toBeNull();
  });

  it("rejects overlong titles and accepts 255 Unicode code points after trimming", async () => {
    const validTitle = "🍲".repeat(255);
    const invalidTitle = "a".repeat(256);

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), invalidTitle);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(screen.getByText(TITLE_LENGTH_ERROR)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), `  ${validTitle}  `);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith({ title: validTitle });
    expect(screen.queryByText(TITLE_LENGTH_ERROR)).toBeNull();
  });

  it("preserves edits after failure and retries without exposing private errors", async () => {
    const editedTitle = "Updated soup";

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error("Private failure")).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), editedTitle);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy();
    expect(screen.queryByText("Private failure")).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(editedTitle);
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenNthCalledWith(2, { title: editedTitle });
    expect(screen.queryByText(SAVE_ERROR)).toBeNull();
  });

  it("disables editing and repeated saves while submission is pending", async () => {
    let resolveSave!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });

    const onSubmit = jest.fn().mockReturnValue(pending);

    await renderForm(onSubmit);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeDisabled();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveProp("editable", false);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { RecipeEditForm } from "../recipe-edit-form";

const DESCRIPTION_LABEL = "Description (optional)";
const EDITED_TITLE = "Updated soup";
const INITIAL_TITLE = "Chicken Soup";
const PRIVATE_ERROR_MESSAGE = "Private failure";
const SAVE_ERROR = "Unable to save changes. Please try again.";
const SAVE_LABEL = "Save changes";
const TITLE_BLANK_ERROR = "Enter a recipe title.";
const TITLE_LABEL = "Recipe title";
const TITLE_LENGTH_ERROR = "Recipe titles must be 255 characters or fewer.";

const renderForm = async (onSubmit: (values: { title: string }) => Promise<void>) => {
  await render(<RecipeEditForm initialTitle={INITIAL_TITLE} onSubmit={onSubmit} />);
};

describe("RecipeEditForm", () => {
  it("prefills the title and submits only the trimmed edited title", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await renderForm(onSubmit);

    const input = screen.getByLabelText(TITLE_LABEL);
    expect(input).toHaveDisplayValue(INITIAL_TITLE);

    await fireEvent.changeText(input, `  ${EDITED_TITLE}  `);
    expect(input).toHaveDisplayValue(`  ${EDITED_TITLE}  `);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: EDITED_TITLE,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
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
    expect(onSubmit).toHaveBeenCalledWith({
      title: INITIAL_TITLE,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
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
    expect(onSubmit).toHaveBeenCalledWith({
      title: validTitle,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
    expect(screen.queryByText(TITLE_LENGTH_ERROR)).toBeNull();
  });

  it("preserves edits after failure and retries without exposing private errors", async () => {
    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(PRIVATE_ERROR_MESSAGE)).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(await screen.findByText(SAVE_ERROR)).toBeTruthy();
    expect(screen.queryByText(PRIVATE_ERROR_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenNthCalledWith(2, {
      title: EDITED_TITLE,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
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
    expect(screen.getByLabelText(DESCRIPTION_LABEL)).toHaveProp("editable", false);
    expect(screen.getByLabelText("Servings or yield quantity")).toHaveProp("editable", false);
    expect(screen.getByLabelText("Yield unit (optional)")).toHaveProp("editable", false);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();
  });

  it("prefills a multiline description and trims only its surrounding whitespace on save", async () => {
    const original = "Original description";
    const edited = "  First line.\nSecond line.  ";

    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await render(<RecipeEditForm initialTitle={INITIAL_TITLE} initialDescription={original} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(DESCRIPTION_LABEL);
    expect(input).toHaveDisplayValue(original);
    expect(input).toHaveProp("multiline", true);

    await fireEvent.changeText(input, edited);
    expect(input).toHaveDisplayValue(edited);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: INITIAL_TITLE,
      description: edited.trim(),
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
  });

  it.each(["", "  \n  "])("sends null when an existing description is cleared: %p", async (description) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await render(
      <RecipeEditForm initialTitle={INITIAL_TITLE} initialDescription='Old description' onSubmit={onSubmit} />,
    );

    await fireEvent.changeText(screen.getByLabelText(DESCRIPTION_LABEL), description);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith({
      title: INITIAL_TITLE,
      description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
  });

  it("shows an empty input for a null description", async () => {
    await render(<RecipeEditForm initialTitle={INITIAL_TITLE} initialDescription={null} onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(DESCRIPTION_LABEL)).toHaveDisplayValue("");
  });

  it("preserves both edits after failure and resubmits the description", async () => {
    const updatedDescription = "Updated description";
    const updatedTitle = "Updated title";

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(PRIVATE_ERROR_MESSAGE)).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), updatedTitle);
    await fireEvent.changeText(screen.getByLabelText(DESCRIPTION_LABEL), updatedDescription);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    await screen.findByText(SAVE_ERROR);
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(updatedTitle);
    expect(screen.getByLabelText(DESCRIPTION_LABEL)).toHaveDisplayValue(updatedDescription);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenNthCalledWith(2, {
      title: updatedTitle,
      description: updatedDescription,
      prep_time_minutes: null,
      cook_time_minutes: null,
      total_time_minutes: null,
      base_servings: null,
      servings_unit: null,
    });
  });
});

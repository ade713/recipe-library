import { fireEvent, render, screen } from "@testing-library/react-native";
import { RecipeEditForm } from "../recipe-edit-form";

const QUANTITY_ERROR_MESSAGE = "Enter a servings or yield quantity of zero or greater.";
const QUANTITY_LABEL = "Servings or yield quantity";
const SAVE_LABEL = "Save changes";
const TITLE = "Bread";
const UNIT = "loaves";
const UNIT_LABEL = "Yield unit (optional)";

const renderForm = async (onSubmit = jest.fn().mockResolvedValue(undefined)) => {
  await render(
    <RecipeEditForm initialTitle={TITLE} initialBaseServings='1.5' initialServingsUnit={UNIT} onSubmit={onSubmit} />,
  );
  return onSubmit;
};

describe("RecipeEditForm servings", () => {
  it("prefills the decimal quantity and unit without changing them on save", async () => {
    const onSubmit = await renderForm();

    expect(screen.getByLabelText(QUANTITY_LABEL)).toHaveDisplayValue("1.5");
    expect(screen.getByLabelText(UNIT_LABEL)).toHaveDisplayValue(UNIT);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ base_servings: 1.5, servings_unit: UNIT }));
  });

  it("prefills zero and accepts a fractional edit", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await render(<RecipeEditForm initialTitle={TITLE} initialBaseServings='0' onSubmit={onSubmit} />);

    expect(screen.getByLabelText(QUANTITY_LABEL)).toHaveDisplayValue("0");

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ base_servings: 0 }));

    await fireEvent.changeText(screen.getByLabelText(QUANTITY_LABEL), " 2.5 ");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ base_servings: 2.5 }));
  });

  it("shows blank inputs for null values and submits null", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await render(
      <RecipeEditForm initialTitle={TITLE} initialBaseServings={null} initialServingsUnit={null} onSubmit={onSubmit} />,
    );

    expect(screen.getByLabelText(QUANTITY_LABEL)).toHaveDisplayValue("");
    expect(screen.getByLabelText(UNIT_LABEL)).toHaveDisplayValue("");

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ base_servings: null, servings_unit: null }));
  });

  it.each([
    { label: QUANTITY_LABEL, expected: { base_servings: null, servings_unit: UNIT } },
    { label: UNIT_LABEL, expected: { base_servings: 1.5, servings_unit: null } },
  ])("clears each field independently: $label", async ({ label, expected }) => {
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(label), "   ");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining(expected));
  });

  it("rejects negative/nonfinite quantities and allows correction", async () => {
    const onSubmit = await renderForm();

    for (const invalid of ["-1", "abc", "Infinity", "1e309"]) {
      await fireEvent.changeText(screen.getByLabelText(QUANTITY_LABEL), invalid);
      await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
      expect(screen.getByText(QUANTITY_ERROR_MESSAGE)).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    }

    await fireEvent.changeText(screen.getByLabelText(QUANTITY_LABEL), "2");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ base_servings: 2 }));
    expect(screen.queryByText(QUANTITY_ERROR_MESSAGE)).toBeNull();
  });

  it("preserves edits after failure and trims the unit only when submitting", async () => {
    const networkErrorMessage = "Network failure";
    const updateErrorMessage = "Unable to save changes. Please try again.";
    const unit = "small loaves";
    const unitWithWhitespace = `  ${unit}  `;

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(networkErrorMessage)).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(QUANTITY_LABEL), "3.5");
    await fireEvent.changeText(screen.getByLabelText(UNIT_LABEL), unitWithWhitespace);
    expect(screen.getByLabelText(UNIT_LABEL)).toHaveDisplayValue(unitWithWhitespace);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    await screen.findByText(updateErrorMessage);
    expect(screen.getByLabelText(QUANTITY_LABEL)).toHaveDisplayValue("3.5");
    expect(screen.getByLabelText(UNIT_LABEL)).toHaveDisplayValue(unitWithWhitespace);

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenNthCalledWith(2, expect.objectContaining({ base_servings: 3.5, servings_unit: unit }));
  });
});

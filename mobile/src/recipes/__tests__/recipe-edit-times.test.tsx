import { fireEvent, render, screen } from "@testing-library/react-native";
import { RecipeEditForm } from "../recipe-edit-form";

const TITLE = "Soup";
const SAVE_LABEL = "Save changes";
const ERROR_MESSAGE = "Enter times as whole minutes, zero or greater.";
const FIELDS = [
  { label: "Prep time (minutes)", key: "prep_time_minutes" },
  { label: "Cook time (minutes)", key: "cook_time_minutes" },
  { label: "Total time (minutes)", key: "total_time_minutes" },
];

const renderForm = async (onSubmit = jest.fn().mockResolvedValue(undefined)) => {
  await render(
    <RecipeEditForm
      initialTitle={TITLE}
      initialPrepTimeMinutes={0}
      initialCookTimeMinutes={20}
      initialTotalTimeMinutes={45}
      onSubmit={onSubmit}
    />,
  );

  return onSubmit;
};

describe("RecipeEditForm times", () => {
  it("prefills zero and saved times and preserves an independent total", async () => {
    const onSubmit = await renderForm();

    for (const [index, value] of ["0", "20", "45"].entries()) {
      expect(screen.getByLabelText(FIELDS[index].label)).toHaveDisplayValue(value);
    }

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prep_time_minutes: 0,
        cook_time_minutes: 20,
        total_time_minutes: 45,
      }),
    );
  });

  it("shows blank inputs for absent times and submits null", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    await render(<RecipeEditForm initialTitle={TITLE} initialPrepTimeMinutes={null} onSubmit={onSubmit} />);

    for (const field of FIELDS) {
      expect(screen.getByLabelText(field.label)).toHaveDisplayValue("");
    }

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prep_time_minutes: null,
        cook_time_minutes: null,
        total_time_minutes: null,
      }),
    );
  });

  it.each(FIELDS)("clears a saved time using null: $label", async ({ label, key }) => {
    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(label), "   ");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ [key]: null }));
  });

  it.each(FIELDS)("rejects invalid input and allows correction: $label", async ({ label, key }) => {
    const onSubmit = await renderForm();

    for (const invalid of ["-1", "1.5", "abc", "Infinity", "9007199254740992"]) {
      await fireEvent.changeText(screen.getByLabelText(label), invalid);
      await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
      expect(screen.getByText(ERROR_MESSAGE)).toBeTruthy();
      expect(onSubmit).not.toHaveBeenCalled();
    }

    await fireEvent.changeText(screen.getByLabelText(label), " 12 ");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ [key]: 12 }));
    expect(screen.queryByText(ERROR_MESSAGE)).toBeNull();
  });

  it("preserves time edits after failure and resubmits them", async () => {
    const networkErrorMessage = "Network failure";
    const updateErrorMessage = "Unable to save changes. Please try again.";

    const onSubmit = jest.fn().mockRejectedValueOnce(new Error(networkErrorMessage)).mockResolvedValueOnce(undefined);

    await renderForm(onSubmit);

    await fireEvent.changeText(screen.getByLabelText(FIELDS[0].label), "10");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    await screen.findByText(updateErrorMessage);
    expect(screen.getByLabelText(FIELDS[0].label)).toHaveDisplayValue("10");
    expect(screen.getByLabelText(FIELDS[2].label)).toHaveDisplayValue("45");

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(onSubmit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prep_time_minutes: 10,
        cook_time_minutes: 20,
        total_time_minutes: 45,
      }),
    );
  });
});

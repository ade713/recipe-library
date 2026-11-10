import { fireEvent, render, screen } from "@testing-library/react-native";
import type { RecipeStep } from "@/types/recipe";
import { RecipeEditForm } from "../recipe-edit-form";

const ADD_STEP = "Add step";
const BAKING_SECTION = "Baking";
const REMOVE_STEP_1 = "Remove step 1";
const STEP_LABEL_1 = "Step 1";
const STEP_LABEL_2 = "Step 2";
const STEPS: RecipeStep[] = [
  { position: 1, instruction: "Mix the dough", section_title: "Preparation" },
  { position: 2, instruction: "Bake until golden", section_title: "Baking" },
];

const renderForm = async (initialSteps = STEPS) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  await render(<RecipeEditForm initialTitle='Bread' initialSteps={initialSteps} onSubmit={onSubmit} />);
  return onSubmit;
};
const save = async () => {
  await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
};

describe("RecipeEditForm instructions", () => {
  it("prefills saved steps and preserves their section titles when untouched", async () => {
    const onSubmit = await renderForm();

    expect(screen.getByLabelText(STEP_LABEL_1)).toHaveDisplayValue(STEPS[0].instruction);
    expect(screen.getByLabelText(STEP_LABEL_2)).toHaveDisplayValue(STEPS[1].instruction);

    await save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ steps: STEPS }));
  });

  it("trims at submission, omits blank steps, and renumbers without losing sections", async () => {
    const stepWithWhitespaces = "  Bake slowly.\nLet cool.  ";
    const whitepsace = "  ";

    const onSubmit = await renderForm();

    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), whitepsace);
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_2), stepWithWhitespaces);
    expect(screen.getByLabelText(STEP_LABEL_2)).toHaveDisplayValue(stepWithWhitespaces);

    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [{ position: 1, instruction: stepWithWhitespaces.trim(), section_title: BAKING_SECTION }],
      }),
    );
  });

  it("removes a saved step and adds editable rows with no inherited section", async () => {
    const bakeStep = "Bake until golden";
    const removeStep2 = "Remove step 2";
    const discardStep = "Discard this row";
    const serveStep = "Serve warm";

    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_STEP_1 }));
    expect(screen.getByLabelText(STEP_LABEL_1)).toHaveDisplayValue(bakeStep);

    await fireEvent.press(screen.getByRole("button", { name: ADD_STEP }));
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_2), discardStep);
    await fireEvent.press(screen.getByRole("button", { name: removeStep2 }));
    await fireEvent.press(screen.getByRole("button", { name: ADD_STEP }));
    expect(screen.getByLabelText(STEP_LABEL_2)).toHaveDisplayValue("");

    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_2), serveStep);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        steps: [
          { position: 1, instruction: bakeStep, section_title: BAKING_SECTION },
          { position: 2, instruction: serveStep, section_title: null },
        ],
      }),
    );
  });

  it("submits an empty array when every saved step is removed", async () => {
    const onSubmit = await renderForm();

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_STEP_1 }));
    await fireEvent.press(screen.getByRole("button", { name: REMOVE_STEP_1 }));
    expect(screen.queryByLabelText(STEP_LABEL_1)).toBeNull();

    await save();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ steps: [] }));
  });

  it("allows adding instructions to a recipe with no saved steps", async () => {
    const step = "Mix well";

    const onSubmit = await renderForm([]);

    expect(screen.queryByLabelText(STEP_LABEL_1)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: ADD_STEP }));
    await fireEvent.changeText(screen.getByLabelText(STEP_LABEL_1), step);
    await save();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ steps: [{ position: 1, instruction: step, section_title: null }] }),
    );
  });
});

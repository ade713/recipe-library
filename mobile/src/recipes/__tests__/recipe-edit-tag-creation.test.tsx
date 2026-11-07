import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ApiError } from "@/api/errors";
import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as tagService from "@/tags/tag-service";
import * as recipeService from "../recipe-service";
import { RecipeEditScreen } from "../recipe-edit-screen";

const EDITED_TITLE = "Edited dinner";
const DINNER = { id: "dinner-id", name: "Dinner" };
const QUICK = { id: "new-tag-id", name: "Quick" };
const RECIPE_ID = "recipe-one";
const SAVE_BUTTON_LABEL = "Save changes";
const SEARCH_TITLE_LABEL = "Recipe title";

const renderScreen = async () => {
  await render(<RecipeEditScreen recipeId={RECIPE_ID} onSaved={jest.fn()} />);
  return screen.findByLabelText("Search tags");
};

beforeEach(() => {
  jest
    .spyOn(recipeService, "loadRecipe")
    .mockResolvedValue(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [DINNER.name] }));
  jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER] });
});

describe("RecipeEditScreen inline tag creation", () => {
  it("offers creation for a trimmed new name but not blank or case-insensitive existing names", async () => {
    const search = await renderScreen();

    for (const value of ["", "  ", " dinner "]) {
      await fireEvent.changeText(search, value);
      expect(screen.queryByRole("button", { name: /^Create tag / })).toBeNull();
    }

    await fireEvent.changeText(search, `  ${QUICK.name}  `);
    expect(search).toHaveDisplayValue(`  ${QUICK.name}  `);
    expect(screen.getByRole("button", { name: `Create tag ${QUICK.name}` })).toBeTruthy();
  });

  it("limits names to 50 Unicode code points", async () => {
    const search = await renderScreen();
    const validName = "🍲".repeat(50);
    const tagInvalidErrorMessage = "Tag names must be 50 characters or fewer.";

    await fireEvent.changeText(search, validName);
    expect(screen.getByRole("button", { name: `Create tag ${validName}` })).toBeTruthy();

    await fireEvent.changeText(search, validName + "a");
    expect(screen.queryByRole("button", { name: /^Create tag / })).toBeNull();
    expect(screen.getByText(tagInvalidErrorMessage)).toBeTruthy();
  });

  it("creates once, selects the returned tag, and saves it alongside existing selections", async () => {
    const createMock = jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);
    const saveMock = jest
      .spyOn(recipeService, "saveRecipeChanges")
      .mockResolvedValue(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [DINNER.name, QUICK.name] }));

    const search = await renderScreen();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TITLE_LABEL), EDITED_TITLE);
    await fireEvent.changeText(search, `  ${QUICK.name}  `);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(await screen.findByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `Remove tag ${DINNER.name}` })).toBeTruthy();
    expect(search).toHaveDisplayValue("");
    expect(screen.getByLabelText(SEARCH_TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(QUICK.name);
    expect(saveMock).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, expect.objectContaining({ tags: [DINNER.name, QUICK.name] }));
  });

  it("allows creating the first available tag for an untagged recipe", async () => {
    const noAvailableTagsMessage = "No tags yet.";

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [] }));
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [] });
    jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);

    const search = await renderScreen();

    expect(screen.getByText(noAvailableTagsMessage)).toBeTruthy();

    await fireEvent.changeText(search, QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(await screen.findByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeTruthy();
    expect(screen.queryByText(noAvailableTagsMessage)).toBeNull();
  });
});

describe("RecipeEditScreen tag creation feedback", () => {
  it.each([
    { error: new ApiError(409), message: "A tag with this name already exists." },
    { error: new Error("Private network failure"), message: "Unable to create tag. Please try again." },
  ])("shows local creation feedback and supports correction/retry: $message", async ({ error, message }) => {
    const createMock = jest.spyOn(tagService, "saveTag").mockRejectedValueOnce(error).mockResolvedValueOnce(QUICK);

    const search = await renderScreen();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TITLE_LABEL), EDITED_TITLE);
    await fireEvent.changeText(search, QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText(error.message)).toBeNull();
    expect(search).toHaveDisplayValue(QUICK.name);
    expect(screen.getByLabelText(SEARCH_TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
    expect(screen.getByRole("button", { name: `Remove tag ${DINNER.name}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: SAVE_BUTTON_LABEL })).toBeEnabled();

    await fireEvent.changeText(search, ` ${QUICK.name} `);
    expect(screen.queryByText(message)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(await screen.findByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeTruthy();
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("locks search, chips, Create, and recipe saving while tag creation is pending", async () => {
    let resolveCreate!: (value: typeof QUICK) => void;
    const pending = new Promise<typeof QUICK>((resolve) => {
      resolveCreate = resolve;
    });
    const quickMeal = { id: "quick-meal", name: "Quick meal" };
    const creatingTagMessage = "Creating tag...";

    const createMock = jest.spyOn(tagService, "saveTag").mockReturnValue(pending);
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(makeRecipeDetailResponse());
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER, quickMeal] });

    const search = await renderScreen();

    await fireEvent.changeText(search, QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(screen.getByText(creatingTagMessage)).toBeTruthy();
    expect(search).toHaveProp("editable", false);
    expect(screen.getByRole("button", { name: `Remove tag ${DINNER.name}` })).toBeDisabled();
    expect(screen.getByRole("button", { name: `Select tag ${quickMeal.name}` })).toBeDisabled();
    expect(screen.getByRole("button", { name: `Create tag ${QUICK.name}` })).toBeDisabled();
    expect(screen.getByRole("button", { name: SAVE_BUTTON_LABEL })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(saveMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate(QUICK);
    });
    expect(screen.queryByText(creatingTagMessage)).toBeNull();
    expect(screen.getByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeEnabled();
    expect(screen.getByRole("button", { name: SAVE_BUTTON_LABEL })).toBeEnabled();
    expect(search).toHaveProp("editable", true);
  });

  it("prevents creation while recipe saving is pending and allows it after save failure", async () => {
    let rejectSave!: (error: Error) => void;
    const pending = new Promise<ReturnType<typeof makeRecipeDetailResponse>>((_, reject) => {
      rejectSave = reject;
    });
    const saveFailureMessage = "Save failed";

    jest.spyOn(recipeService, "saveRecipeChanges").mockReturnValue(pending);
    const createMock = jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);

    const search = await renderScreen();

    await fireEvent.changeText(search, QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_BUTTON_LABEL }));
    expect(screen.getByRole("button", { name: `Create tag ${QUICK.name}` })).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(createMock).not.toHaveBeenCalled();

    await act(async () => {
      rejectSave(new Error(saveFailureMessage));
    });
    expect(screen.getByRole("button", { name: `Create tag ${QUICK.name}` })).toBeEnabled();
    expect(search).toHaveDisplayValue(QUICK.name);
  });
});

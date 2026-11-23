import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ApiError } from "@/api/errors";
import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as tagService from "@/tags/tag-service";
import type { RecipeImportPreviewResponse } from "@/types/import";

import { ImportRecipeScreen } from "../import-recipe-screen";
import * as importService from "../import-service";

const IMPORT_ID = "import-with-new-tag";
const PREVIEW_RECIPE_LABEL = "Preview recipe";
const RECIPE_TITLE_INPUT_LABEL = "Recipe title";
const RECIPE_URL_INPUT_LABEL = "Recipe URL";
const REVIEWED_TITLE = "Reviewed soup";
const SAVE_RECIPE_LABEL = "Save recipe";
const SEARCH_TAGS_LABEL = "Search tags";
const TAG_CREATE_ERROR_MESSAGE = "Unable to create tag. Please try again.";

const DINNER = { id: "dinner-id", name: "Dinner" };
const QUICK = { id: "created-tag-id", name: "Quick" };

const renderPreview = async () => {
  const recipeUrl = "https://example.com/soup";
  const { id, ...draft } = makeRecipeDetailResponse({ tags: [DINNER.name] });
  const preview: RecipeImportPreviewResponse = {
    import_id: IMPORT_ID,
    status: "success",
    parser_used: "recipe-scrapers",
    draft,
    warnings: [],
    existing_recipe_id: null,
    next_actions: [],
  };

  jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER] });
  const previewMock = jest.spyOn(importService, "loadImportPreview").mockResolvedValue(preview);

  await render(<ImportRecipeScreen />);

  await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), recipeUrl);
  await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));
  await screen.findByRole("button", { name: `Remove tag ${DINNER.name}` });
  return { preview, previewMock };
};

describe("imported draft inline tag creation", () => {
  it("blocks competing actions during creation while keeping recipe fields editable", async () => {
    const creatingTagMessage = "Creating tag...";

    let resolveCreate!: (tag: typeof QUICK) => void;
    const createMock = jest.spyOn(tagService, "saveTag").mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    const { previewMock } = await renderPreview();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));

    try {
      expect(screen.getByText(creatingTagMessage)).toBeTruthy();
      expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toBeDisabled();
      expect(screen.getByLabelText(RECIPE_URL_INPUT_LABEL)).toBeDisabled();
      for (const name of [
        `Remove tag ${DINNER.name}`,
        `Create tag ${QUICK.name}`,
        SAVE_RECIPE_LABEL,
        PREVIEW_RECIPE_LABEL,
      ]) {
        expect(screen.getByRole("button", { name })).toBeDisabled();
        await fireEvent.press(screen.getByRole("button", { name }));
      }
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(saveMock).not.toHaveBeenCalled();
      expect(previewMock).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toBeEnabled();
      await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL), REVIEWED_TITLE);
    } finally {
      await act(async () => {
        resolveCreate(QUICK);
      });
    }

    expect(await screen.findByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeEnabled();
    expect(screen.queryByText(creatingTagMessage)).toBeNull();
    expect(screen.getByRole("button", { name: SAVE_RECIPE_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL })).toBeEnabled();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toBeEnabled();
    expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toHaveDisplayValue(REVIEWED_TITLE);
  });

  it("clears old creation feedback and search when a new preview replaces the draft", async () => {
    const anotherRecipeUrl = "https://example.com/another-soup";
    const replacementImportId = "replacement-import";
    const privateErrorMessage = "Private failure";

    jest.spyOn(tagService, "saveTag").mockRejectedValue(new Error(privateErrorMessage));

    const { preview, previewMock } = await renderPreview();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(await screen.findByText(TAG_CREATE_ERROR_MESSAGE)).toBeTruthy();

    previewMock.mockResolvedValue({ ...preview, import_id: replacementImportId });
    await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), anotherRecipeUrl);
    await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));
    await screen.findByRole("button", { name: `Remove tag ${DINNER.name}` });

    expect(screen.queryByText(TAG_CREATE_ERROR_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toHaveDisplayValue("");
    expect(screen.queryByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeNull();
    expect(previewMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { error: new ApiError(409), message: "A tag with this name already exists." },
    { error: new Error("Private tag failure"), message: TAG_CREATE_ERROR_MESSAGE },
  ])("preserves edits and supports correction/retry after creation failure: $message", async ({ error, message }) => {
    const createMock = jest.spyOn(tagService, "saveTag").mockRejectedValueOnce(error).mockResolvedValueOnce(QUICK);
    const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    await renderPreview();

    await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL), REVIEWED_TITLE);
    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText(error.message)).toBeNull();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toHaveDisplayValue(QUICK.name);
    expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toHaveDisplayValue(REVIEWED_TITLE);
    expect(screen.getByRole("button", { name: `Remove tag ${DINNER.name}` })).toBeTruthy();
    expect(screen.queryByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeNull();
    expect(screen.getByRole("button", { name: SAVE_RECIPE_LABEL })).toBeEnabled();
    expect(saveMock).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), ` ${QUICK.name} `);
    expect(screen.queryByText(message)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));
    expect(await screen.findByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeTruthy();
    expect(screen.queryByText(message)).toBeNull();
    expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toHaveDisplayValue(REVIEWED_TITLE);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenLastCalledWith(QUICK.name);
  });

  it("shows name validation without offering creation for an overlong name", async () => {
    const tagValidationErrorMessage = "Tag names must be 50 characters or fewer.";

    const createMock = jest.spyOn(tagService, "saveTag");

    await renderPreview();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), "a".repeat(51));

    expect(screen.getByText(tagValidationErrorMessage)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Create tag / })).toBeNull();
    expect(createMock).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), QUICK.name);
    expect(screen.queryByText(tagValidationErrorMessage)).toBeNull();
    expect(screen.getByRole("button", { name: `Create tag ${QUICK.name}` })).toBeTruthy();
  });

  it("creates a trimmed tag once, selects the returned tag, and includes it when saving", async () => {
    const createMock = jest.spyOn(tagService, "saveTag").mockResolvedValue(QUICK);
    const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    await renderPreview();

    await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL), REVIEWED_TITLE);
    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), `  ${QUICK.name}  `);
    await fireEvent.press(screen.getByRole("button", { name: `Create tag ${QUICK.name}` }));

    expect(await screen.findByRole("button", { name: `Remove tag ${QUICK.name}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `Remove tag ${DINNER.name}` })).toBeTruthy();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toHaveDisplayValue("");
    expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toHaveDisplayValue(REVIEWED_TITLE);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(QUICK.name);
    expect(saveMock).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(
      IMPORT_ID,
      expect.objectContaining({ title: REVIEWED_TITLE, tags: [DINNER.name, QUICK.name] }),
    );
  });
});

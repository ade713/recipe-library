import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as tagService from "@/tags/tag-service";
import type { RecipeDetailResponse } from "@/types/recipe";
import type { RecipeImportPreviewResponse } from "@/types/import";
import type { TagListResponse } from "@/types/tag";

import { ImportRecipeScreen } from "../import-recipe-screen";
import * as importService from "../import-service";

const DINNER = { id: "dinner-id", name: "Dinner" };
const IMPORT_ID = "import-with-tags";
const PREVIEW_RECIPE_LABEL = "Preview recipe";
const QUICK = { id: "quick-id", name: "Quick" };
const RECIPE_TITLE_INPUT_LABEL = "Recipe title";
const RECIPE_URL = "https://example.com/soup";
const RECIPE_URL_INPUT_LABEL = "Recipe URL";
const REMOVE_DINNER_TAG_LABEL = "Remove tag Dinner";
const REMOVE_QUICK_TAG_LABEL = "Remove tag Quick";
const RETRY_TAGS_LABEL = "Retry tags";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const SAVE_RECIPE_LABEL = "Save recipe";
const SEARCH_TAGS_LABEL = "Search tags";
const SELECT_QUICK_TAG_LABEL = "Select tag Quick";
const SHORT_SEARCH = "qui";
const TAG_LOADING_ERROR_MESSAGE = "Unable to load tags.";
const UNAVAILABLE_ERROR_MESSAGE = "Unavailable";

const previewWithTags = (tags: string[]): RecipeImportPreviewResponse => {
  const { id, ...draft } = makeRecipeDetailResponse({ tags });
  return {
    import_id: IMPORT_ID,
    status: "success",
    parser_used: "recipe-scrapers",
    draft,
    warnings: [],
    existing_recipe_id: null,
    next_actions: [],
  };
};

const renderPreviewWithDinnerTag = async () => {
  const tags = [DINNER.name];

  jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER, QUICK] });
  jest.spyOn(importService, "loadImportPreview").mockResolvedValue(previewWithTags(tags));
  const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

  await render(<ImportRecipeScreen />);

  await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
  await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));
  await screen.findByRole("button", { name: REMOVE_DINNER_TAG_LABEL });

  return saveMock;
};

describe("imported draft existing tags", () => {
  it("disables tag search, selection, and removal while saving", async () => {
    const saveMock = await renderPreviewWithDinnerTag();

    let resolveSave!: (recipe: RecipeDetailResponse) => void;
    saveMock.mockReturnValueOnce(
      new Promise<RecipeDetailResponse>((resolve) => {
        resolveSave = resolve;
      }),
    );

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), SHORT_SEARCH);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toBeDisabled();
    expect(screen.getByRole("button", { name: SELECT_QUICK_TAG_LABEL })).toBeDisabled();
    expect(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: SELECT_QUICK_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL }));

    await act(async () => {
      resolveSave(makeRecipeDetailResponse());
    });
    expect(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL })).toBeTruthy();
    expect(screen.queryByRole("button", { name: REMOVE_QUICK_TAG_LABEL })).toBeNull();
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [DINNER.name] }));
  });

  it("preserves changed tag selection and search after save failure for retry", async () => {
    const privateErrorMessage = "Private save failure";
    const dinShortSearch = "din";
    const selectDinnerTagLabel = "Select tag Dinner";

    const saveMock = await renderPreviewWithDinnerTag();
    saveMock.mockRejectedValueOnce(new Error(privateErrorMessage));

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), SHORT_SEARCH);
    await fireEvent.press(screen.getByRole("button", { name: SELECT_QUICK_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL }));
    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), dinShortSearch);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(await screen.findByText(SAVE_RECIPE_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toHaveDisplayValue(dinShortSearch);
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toBeEnabled();
    expect(screen.getByRole("button", { name: REMOVE_QUICK_TAG_LABEL })).toBeEnabled();
    expect(screen.getByRole("button", { name: selectDinnerTagLabel })).toBeEnabled();
    expect(screen.queryByRole("button", { name: REMOVE_DINNER_TAG_LABEL })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));
    expect(saveMock).toHaveBeenCalledTimes(2);
    for (const callNumber of [1, 2]) {
      expect(saveMock).toHaveBeenNthCalledWith(callNumber, IMPORT_ID, expect.objectContaining({ tags: [QUICK.name] }));
    }
  });

  it("disables tag retry during saving and enables it again after save failure", async () => {
    const saveFailedErrorMessage = "Save failed";

    const loadMock = jest.spyOn(tagService, "loadTags").mockRejectedValue(new Error(UNAVAILABLE_ERROR_MESSAGE));
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(previewWithTags([DINNER.name]));
    let rejectSave!: (error: Error) => void;
    jest.spyOn(importService, "saveImportDraft").mockReturnValueOnce(
      new Promise<RecipeDetailResponse>((_, reject) => {
        rejectSave = reject;
      }),
    );

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
    await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));
    await screen.findByText(TAG_LOADING_ERROR_MESSAGE);
    const loadCount = loadMock.mock.calls.length;
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(screen.getByRole("button", { name: RETRY_TAGS_LABEL })).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TAGS_LABEL }));
    expect(loadMock).toHaveBeenCalledTimes(loadCount);

    await act(async () => {
      rejectSave(new Error(saveFailedErrorMessage));
    });
    expect(await screen.findByText(SAVE_RECIPE_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: RETRY_TAGS_LABEL })).toBeEnabled();

    loadMock.mockResolvedValue({ items: [DINNER, QUICK] });
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TAGS_LABEL }));
    expect(await screen.findByRole("button", { name: REMOVE_DINNER_TAG_LABEL })).toBeTruthy();
  });

  it("preserves original draft tags when loading fails and still allows recipe saving", async () => {
    const reviewedTitle = "Review soup";
    const privateErrorMessage = "Private tag request failure";

    jest.spyOn(tagService, "loadTags").mockRejectedValue(new Error(privateErrorMessage));
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(previewWithTags([DINNER.name]));
    const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
    await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));

    expect(await screen.findByText(TAG_LOADING_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.queryByLabelText(SEARCH_TAGS_LABEL)).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL), reviewedTitle);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(
      IMPORT_ID,
      expect.objectContaining({
        title: reviewedTitle,
        tags: [DINNER.name],
      }),
    );
  });

  it("retries tag loading without resetting recipe edits and initializes selection afterward", async () => {
    const editsTitle = "Keep my edits";

    const loadMock = jest.spyOn(tagService, "loadTags").mockRejectedValue(new Error(UNAVAILABLE_ERROR_MESSAGE));
    const previewMock = jest
      .spyOn(importService, "loadImportPreview")
      .mockResolvedValue(previewWithTags([DINNER.name]));
    jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
    await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));
    await screen.findByText(TAG_LOADING_ERROR_MESSAGE);
    await fireEvent.changeText(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL), editsTitle);

    let resolveTags!: (response: TagListResponse) => void;
    loadMock.mockImplementation(
      () =>
        new Promise<TagListResponse>((resolve) => {
          resolveTags = resolve;
        }),
    );
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TAGS_LABEL }));

    expect(await screen.findByText("Loading tags...")).toBeTruthy();
    expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toHaveDisplayValue(editsTitle);
    expect(screen.getByRole("button", { name: SAVE_RECIPE_LABEL })).toBeEnabled();

    await act(async () => {
      resolveTags({ items: [DINNER, QUICK] });
    });
    expect(await screen.findByRole("button", { name: REMOVE_DINNER_TAG_LABEL })).toBeTruthy();
    expect(screen.getByLabelText(RECIPE_TITLE_INPUT_LABEL)).toHaveDisplayValue(editsTitle);
    expect(screen.queryByText(TAG_LOADING_ERROR_MESSAGE)).toBeNull();
    expect(previewMock).toHaveBeenCalledTimes(1);
  });

  it("preserves every draft tag when matching is incomplete and can retry the match", async () => {
    const missingName = "Unavailable tag";
    const tagsDraftMatchErrorMessage = "Unable to match draft tags. Please retry.";

    const loadMock = jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER] });
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(previewWithTags([DINNER.name, missingName]));
    const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
    await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));

    expect(await screen.findByText(tagsDraftMatchErrorMessage)).toBeTruthy();
    expect(screen.queryByLabelText(SEARCH_TAGS_LABEL)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [DINNER.name, missingName] }));

    loadMock.mockResolvedValue({ items: [DINNER, { id: "missing-id", name: missingName }] });
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TAGS_LABEL }));
    expect(await screen.findByRole("button", { name: `Remove tag ${missingName}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL })).toBeTruthy();
    expect(screen.queryByText(tagsDraftMatchErrorMessage)).toBeNull();
  });

  it("hides tag controls before a preview exists even when available tags load", async () => {
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER, QUICK] });

    await render(<ImportRecipeScreen />);

    expect(screen.queryByLabelText(SEARCH_TAGS_LABEL)).toBeNull();
    expect(screen.queryByRole("button", { name: /^(Select|Remove) tag / })).toBeNull();
  });

  it.each(["blocked", "failed", "duplicate", "success", "partial"] as const)(
    "hides tag controls when a %s response has a null draft",
    async (status) => {
      const warning = "No editable draft is available.";
      const response: RecipeImportPreviewResponse = {
        ...previewWithTags([]),
        status,
        draft: null,
        warnings: [warning],
      };
      jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER, QUICK] });
      jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

      await render(<ImportRecipeScreen />);

      await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
      await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));

      expect(await screen.findByText(warning)).toBeTruthy();
      expect(screen.queryByLabelText(SEARCH_TAGS_LABEL)).toBeNull();
      expect(screen.queryByRole("button", { name: /^(Select|Remove) tag / })).toBeNull();
      expect(screen.queryByRole("button", { name: SAVE_RECIPE_LABEL })).toBeNull();
    },
  );

  it("allows selecting a tag when the draft exists with an empty tag list", async () => {
    jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER, QUICK] });
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(previewWithTags([]));
    const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
    await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));

    const search = await screen.findByLabelText(SEARCH_TAGS_LABEL);
    expect(screen.queryByRole("button", { name: /Remove tag / })).toBeNull();
    await fireEvent.changeText(search, QUICK.name);
    await fireEvent.press(screen.getByRole("button", { name: SELECT_QUICK_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [QUICK.name] }));
  });

  it("initializes draft tags, searches available tags, and saves selected names", async () => {
    const saveMock = await renderPreviewWithDinnerTag();
    const emptySearch = "";

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), SHORT_SEARCH);
    await fireEvent.press(screen.getByRole("button", { name: SELECT_QUICK_TAG_LABEL }));
    expect(screen.getByRole("button", { name: REMOVE_QUICK_TAG_LABEL })).toBeTruthy();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toHaveDisplayValue(emptySearch);

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [QUICK.name] }));
  });

  it("saves an explicit empty list when all draft tags are removed", async () => {
    const saveMock = await renderPreviewWithDinnerTag();

    await fireEvent.press(screen.getByRole("button", { name: REMOVE_DINNER_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [] }));
  });
});

import { fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as tagService from "@/tags/tag-service";
import type { RecipeImportPreviewResponse } from "@/types/import";

import { ImportRecipeScreen } from "../import-recipe-screen";
import * as importService from "../import-service";

const DINNER = { id: "dinner-id", name: "Dinner" };
const QUICK = { id: "quick-id", name: "Quick" };
const RECIPE_URL = "https://example.com/soup";
const SAVE_RECIPE_LABEL = "Save recipe";
const REVOME_DINNER_TAG_LABEL = "Remove tag Dinner";
const IMPORT_ID = "import-with-tags";
const RECIPE_URL_INPUT_LABEL = "Recipe URL";
const PREVIEW_RECIPE_LABEL = "Preview recipe";
const SEARCH_TAGS_LABEL = "Search tags";
const SELECT_QUICK_TAG_LABEL = "Select tag Quick";

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

const renderPreview = async (tags: string[]) => {
  jest.spyOn(tagService, "loadTags").mockResolvedValue({ items: [DINNER, QUICK] });
  jest.spyOn(importService, "loadImportPreview").mockResolvedValue(previewWithTags(tags));
  const saveMock = jest.spyOn(importService, "saveImportDraft").mockResolvedValue(makeRecipeDetailResponse());

  await render(<ImportRecipeScreen />);

  await fireEvent.changeText(screen.getByLabelText(RECIPE_URL_INPUT_LABEL), RECIPE_URL);
  await fireEvent.press(screen.getByRole("button", { name: PREVIEW_RECIPE_LABEL }));
  await screen.findByRole("button", { name: REVOME_DINNER_TAG_LABEL });

  return saveMock;
};

describe("imported draft existing tags", () => {
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
    const saveMock = await renderPreview([DINNER.name]);
    const emptySearch = "";
    const removeTagLabel = "Remove tag Quick";
    const shortSearch = "qui";

    await fireEvent.changeText(screen.getByLabelText(SEARCH_TAGS_LABEL), shortSearch);
    await fireEvent.press(screen.getByRole("button", { name: SELECT_QUICK_TAG_LABEL }));
    expect(screen.getByRole("button", { name: removeTagLabel })).toBeTruthy();
    expect(screen.getByLabelText(SEARCH_TAGS_LABEL)).toHaveDisplayValue(emptySearch);

    await fireEvent.press(screen.getByRole("button", { name: REVOME_DINNER_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [QUICK.name] }));
  });

  it("saves an explicit empty list when all draft tags are removed", async () => {
    const saveMock = await renderPreview([DINNER.name]);

    await fireEvent.press(screen.getByRole("button", { name: REVOME_DINNER_TAG_LABEL }));
    await fireEvent.press(screen.getByRole("button", { name: SAVE_RECIPE_LABEL }));

    expect(saveMock).toHaveBeenCalledWith(IMPORT_ID, expect.objectContaining({ tags: [] }));
  });
});

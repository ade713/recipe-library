import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeImportPreviewResponse } from "@/types/import";

import { ImportRecipeScreen } from "../import-recipe-screen";
import * as importService from "../import-service";

const DRAFT_TITLE = "Imported soup";
const INGREDIENT_TEXT = "2 cups chopped carrots";
const FIRST_STEP = "Simmer gently";
const SECOND_STEP = "Serve warm";
const PREVIEW_LABEL = "Preview recipe";
const PREVIEW_READY_MESSAGE = "Preview ready.";
const PREVIEW_ERROR_MESSAGE = "Unable to preview recipe. Please try again.";
const RECIPE_URL = "https://example.com/soup";
const URL_LABEL = "Recipe URL";
const WARNING = "Prep time was missing.";

const makePreview = (status: RecipeImportPreviewResponse["status"]): RecipeImportPreviewResponse => {
  const { id, ...draft } = makeRecipeDetailResponse({
    title: DRAFT_TITLE,
    ingredients: [{
      position: 1,
      original_text: INGREDIENT_TEXT,
      quantity: null,
      quantity_text: null,
      unit: null,
      name: null,
      preparation_note: null,
      is_optional: false,
      scale_locked: false,
      parse_status: "unparsed",
    }],
    steps: [
      { position: 1, instruction: FIRST_STEP, section_title: null },
      { position: 2, instruction: SECOND_STEP, section_title: null },
    ],
  });

  return {
    import_id: "import-one",
    status,
    parser_used: null,
    draft: status === "success" || status === "partial" ? draft : null,
    warnings: [WARNING],
    existing_recipe_id: status === "duplicate" ? "recipe-one" : null,
    next_actions: [],
  };
};

const submit = async () => {
  await fireEvent.press(screen.getByRole("button", { name: PREVIEW_LABEL }));
};

describe("ImportRecipeScreen", () => {
  it("waits for a submitted URL before requesting a preview", async () => {
    const requestMock = jest.spyOn(importService, "loadImportPreview");

    await render(<ImportRecipeScreen />);

    expect(screen.getByLabelText(URL_LABEL)).toBeTruthy();
    expect(requestMock).not.toHaveBeenCalled();
    expect(screen.queryByText(DRAFT_TITLE)).toBeNull();
  });

  it.each([
    { status: "success", message: PREVIEW_READY_MESSAGE },
    { status: "partial", message: "Preview ready with missing information." },
  ] as const)("shows $status ingredient text, numbered steps, and warnings", async ({ status, message }) => {
    const missingUrlWarning = "Image URL was missing.";
    const response = makePreview(status);
    response.warnings.push(missingUrlWarning);

    const requestMock = jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), `  ${RECIPE_URL}  `);
    await submit();
    expect(requestMock).toHaveBeenCalledWith({ url: RECIPE_URL });
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText(DRAFT_TITLE)).toBeTruthy();
    expect(screen.getByText(INGREDIENT_TEXT)).toBeTruthy();
    expect(screen.getByText(`1. ${FIRST_STEP}`)).toBeTruthy();
    expect(screen.getByText(`2. ${SECOND_STEP}`)).toBeTruthy();
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(screen.getByText(missingUrlWarning)).toBeTruthy();
  });

  it.each([
    { status: "blocked", message: "This website blocked the import or could not be accessed safely." },
    { status: "failed", message: "No recipe preview could be created." },
    { status: "duplicate", message: "This recipe is already in your library." },
  ] as const)("shows $status feedback without a draft or request error", async ({ status, message }) => {
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(makePreview(status));

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText(WARNING)).toBeTruthy();
    expect(screen.queryByText(DRAFT_TITLE)).toBeNull();
    expect(screen.queryByText(INGREDIENT_TEXT)).toBeNull();
    expect(screen.queryByText(`1. ${FIRST_STEP}`)).toBeNull();
    expect(screen.queryByText(PREVIEW_ERROR_MESSAGE)).toBeNull();
  });

  it("clears an old result before another request and preserves the URL on failure for retry", async () => {
    const nextUrl = "https://example.com/stew";
    const privateErrorMessage = "Private network details";

    let rejectRequest!: (error: Error) => void;
    const pending = new Promise<RecipeImportPreviewResponse>((_, reject) => {
      rejectRequest = reject;
    });
    const requestMock = jest
      .spyOn(importService, "loadImportPreview")
      .mockResolvedValueOnce(makePreview("partial"))
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce(makePreview("success"));

    await render(<ImportRecipeScreen />);

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(await screen.findByText(DRAFT_TITLE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), nextUrl);
    await submit();
    try {
      expect(screen.queryByText(DRAFT_TITLE)).toBeNull();
      expect(screen.queryByText(INGREDIENT_TEXT)).toBeNull();
      expect(screen.queryByText(`1. ${FIRST_STEP}`)).toBeNull();
      expect(screen.queryByText(WARNING)).toBeNull();
    } finally {
      await act(async () => {
        rejectRequest(new Error(privateErrorMessage));
      });
    }
    expect(await screen.findByText(PREVIEW_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.getByLabelText(URL_LABEL)).toHaveDisplayValue(nextUrl);

    await submit();
    expect(await screen.findByText(PREVIEW_READY_MESSAGE)).toBeTruthy();
    expect(requestMock).toHaveBeenNthCalledWith(3, { url: nextUrl });
  });
});

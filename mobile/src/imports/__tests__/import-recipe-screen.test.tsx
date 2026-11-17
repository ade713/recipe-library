import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import type { RecipeImportPreviewResponse } from "@/types/import";

import { ImportRecipeScreen } from "../import-recipe-screen";
import * as importService from "../import-service";

const DRAFT_TITLE = "Imported soup";
const ENTER_MANUALLY_LABEL = "Enter manually";
const FIRST_STEP = "Simmer gently";
const INGREDIENT_TEXT = "2 cups chopped carrots";
const OPEN_EXISTING_RECIPE_LABEL = "Open existing recipe";
const OPEN_SOURCE_URL_LABEL = "Open source URL";
const PREVIEW_ERROR_MESSAGE = "Unable to preview recipe. Please try again.";
const PREVIEW_LABEL = "Preview recipe";
const PREVIEW_READY_MESSAGE = "Preview ready.";
const RECIPE_DUPLICATE_MESSAGE = "This recipe is already in your library.";
const RECIPE_ID = "recipe-one";
const RECIPE_URL = "https://example.com/soup";
const SECOND_STEP = "Serve warm";
const SOURCE_URL_ERROR_MESSAGE = "Unable to open source URL. Please try again.";
const URL_LABEL = "Recipe URL";
const WARNING = "Prep time was missing.";

const makePreview = (status: RecipeImportPreviewResponse["status"]): RecipeImportPreviewResponse => {
  const { id, ...draft } = makeRecipeDetailResponse({
    title: DRAFT_TITLE,
    ingredients: [
      {
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
      },
    ],
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
    existing_recipe_id: status === "duplicate" ? RECIPE_ID : null,
    next_actions: [],
  };
};

type ImportRecipeScreenOptions = {
  onEnterManually?: () => void;
  onOpenExisting?: (recipeId: string) => void;
};

const renderImportRecipeScreen = async ({ onOpenExisting, onEnterManually }: ImportRecipeScreenOptions = {}) => {
  await render(<ImportRecipeScreen onEnterManually={onEnterManually} onOpenExisting={onOpenExisting} />);
};

const submit = async () => {
  await fireEvent.press(screen.getByRole("button", { name: PREVIEW_LABEL }));
};

describe("ImportRecipeScreen", () => {
  it("opens the submitted source URL even after the input changes", async () => {
    const anotherUrl = "https://example.com/another";
    const response = makePreview("failed");
    response.next_actions = ["open_source_url"];

    const openMock = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), `  ${RECIPE_URL}  `);
    await submit();
    expect(openMock).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), anotherUrl);
    await fireEvent.press(await screen.findByRole("button", { name: OPEN_SOURCE_URL_LABEL }));
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith(RECIPE_URL);
  });

  it("hides the source action when it is not offered", async () => {
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(makePreview("failed"));

    await renderImportRecipeScreen();

    expect(screen.queryByRole("button", { name: OPEN_SOURCE_URL_LABEL })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(await screen.findByText(WARNING)).toBeTruthy();
    expect(screen.queryByRole("button", { name: OPEN_SOURCE_URL_LABEL })).toBeNull();
  });

  it("shows safe link failure feedback and clears it after retry", async () => {
    const privateErrorMessage = "Private platform failure";
    const response = makePreview("blocked");
    response.next_actions = ["open_source_url"];

    const openMock = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValueOnce(new Error(privateErrorMessage))
      .mockResolvedValueOnce(undefined);
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    await fireEvent.press(await screen.findByRole("button", { name: OPEN_SOURCE_URL_LABEL }));
    expect(await screen.findByText(SOURCE_URL_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();
    expect(screen.queryByText(PREVIEW_ERROR_MESSAGE)).toBeNull();
    expect(screen.getByText(WARNING)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: OPEN_SOURCE_URL_LABEL }));
    expect(openMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(SOURCE_URL_ERROR_MESSAGE)).toBeNull();
  });

  it("clears previous link feedback and uses the next submitted URL", async () => {
    const linkErrorMessage = "Link failure";
    const response = makePreview("failed");
    response.next_actions = ["open_source_url"];
    const nextUrl = "https://example.com/stew";

    const openMock = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValueOnce(new Error(linkErrorMessage))
      .mockResolvedValueOnce(undefined);
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    await fireEvent.press(await screen.findByRole("button", { name: OPEN_SOURCE_URL_LABEL }));
    expect(await screen.findByText(SOURCE_URL_ERROR_MESSAGE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), nextUrl);
    await submit();
    expect(screen.queryByText(SOURCE_URL_ERROR_MESSAGE)).toBeNull();

    await fireEvent.press(await screen.findByRole("button", { name: OPEN_SOURCE_URL_LABEL }));
    expect(openMock).toHaveBeenLastCalledWith(nextUrl);
  });

  it("shows duplicate status feedback once while preserving other warnings", async () => {
    const response = makePreview("duplicate");

    response.warnings = [`  ${RECIPE_DUPLICATE_MESSAGE}  `, WARNING];
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();

    expect(await screen.findAllByText(RECIPE_DUPLICATE_MESSAGE)).toHaveLength(1);
    expect(screen.getByText(WARNING)).toBeTruthy();
  });

  it("opens the existing recipe only after the user selects the offered action", async () => {
    const response = makePreview("duplicate");
    response.next_actions = ["open_existing", "import_as_copy"];

    const onOpenExisting = jest.fn();
    const requestMock = jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen({ onOpenExisting });

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(onOpenExisting).not.toHaveBeenCalled();

    await fireEvent.press(await screen.findByRole("button", { name: OPEN_EXISTING_RECIPE_LABEL }));
    expect(onOpenExisting).toHaveBeenCalledTimes(1);
    expect(onOpenExisting).toHaveBeenCalledWith(RECIPE_ID);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it.each(["blocked", "failed"] as const)("offers manual entry for a %s response", async (status) => {
    const response = makePreview(status);
    response.next_actions = ["enter_manually", "open_source_url"];

    const onEnterManually = jest.fn();
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen({ onEnterManually });

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(onEnterManually).not.toHaveBeenCalled();

    await fireEvent.press(await screen.findByRole("button", { name: ENTER_MANUALLY_LABEL }));
    expect(onEnterManually).toHaveBeenCalledTimes(1);
  });

  it("does not infer actions from status alone", async () => {
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(makePreview("duplicate"));

    await renderImportRecipeScreen({ onOpenExisting: jest.fn(), onEnterManually: jest.fn() });

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(await screen.findByText(RECIPE_DUPLICATE_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: OPEN_EXISTING_RECIPE_LABEL })).toBeNull();
    expect(screen.queryByRole("button", { name: ENTER_MANUALLY_LABEL })).toBeNull();
  });

  it.each([null, "", "   "])("hides open-existing when the recipe ID is unusable: %p", async (id) => {
    const response = makePreview("duplicate");
    response.next_actions = ["open_existing"];
    response.existing_recipe_id = id;

    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen({ onOpenExisting: jest.fn() });

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(await screen.findByText(RECIPE_DUPLICATE_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: OPEN_EXISTING_RECIPE_LABEL })).toBeNull();
  });

  it("hides navigation actions when callbacks are absent", async () => {
    const response = makePreview("duplicate");
    response.next_actions = ["open_existing", "enter_manually"];

    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(response);

    await renderImportRecipeScreen();

    await fireEvent.changeText(screen.getByLabelText(URL_LABEL), RECIPE_URL);
    await submit();
    expect(await screen.findByText(RECIPE_DUPLICATE_MESSAGE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: OPEN_EXISTING_RECIPE_LABEL })).toBeNull();
    expect(screen.queryByRole("button", { name: ENTER_MANUALLY_LABEL })).toBeNull();
  });

  it("waits for a submitted URL before requesting a preview", async () => {
    const requestMock = jest.spyOn(importService, "loadImportPreview");

    await renderImportRecipeScreen();

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

    await renderImportRecipeScreen();

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
    { status: "duplicate", message: RECIPE_DUPLICATE_MESSAGE },
  ] as const)("shows $status feedback without a draft or request error", async ({ status, message }) => {
    jest.spyOn(importService, "loadImportPreview").mockResolvedValue(makePreview(status));

    await renderImportRecipeScreen();

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

    await renderImportRecipeScreen();

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

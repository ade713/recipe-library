import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";
import * as tagService from "@/tags/tag-service";
import type { TagListResponse } from "@/types/tag";
import * as recipeService from "../recipe-service";
import { RecipeEditScreen } from "../recipe-edit-screen";

const EDITED_TITLE = "Edited dinner";
const LOADING_TAGS = "Loading tags...";
const QUICK_TAG_NAME = "Quick";
const RECIPE_ID = "recipe-one";
const RETRY_TAGS = "Retry tags";
const SAVE_LABEL = "Save changes";
const TAG_ERROR_MESSAGE = "Unable to load tags.";
const TAG_NAME = "Dinner";
const TAGS: TagListResponse = { items: [{ id: "tag-one", name: "Dinner" }] };
const TITLE_LABEL = "Recipe title";

beforeEach(() => {
  jest
    .spyOn(recipeService, "loadRecipe")
    .mockResolvedValue(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [TAG_NAME] }));
});

const renderScreen = async () => {
  await render(<RecipeEditScreen recipeId={RECIPE_ID} onSaved={jest.fn()} />);

  await screen.findByLabelText(TITLE_LABEL);
};

describe("RecipeEditScreen tag loading", () => {
  it("keeps the form usable while tags load and preserves edits when they arrive", async () => {
    let resolveTags!: (value: TagListResponse) => void;
    const loadMock = jest.spyOn(tagService, "loadTags").mockReturnValue(
      new Promise((resolve) => {
        resolveTags = resolve;
      }),
    );

    await renderScreen();

    expect(screen.getByText(LOADING_TAGS)).toBeTruthy();
    expect(screen.getByRole("button", { name: SAVE_LABEL })).toBeEnabled();

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);

    await act(async () => {
      resolveTags(TAGS);
    });
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(LOADING_TAGS)).toBeNull();
    expect(screen.queryByText(TAG_ERROR_MESSAGE)).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
  });

  it("retries a local tag failure without reloading the recipe or losing edits", async () => {
    const privateErrorMessage = "Private tag failure";

    let resolveRetry!: (value: TagListResponse) => void;
    const loadMock = jest
      .spyOn(tagService, "loadTags")
      .mockRejectedValueOnce(new Error(privateErrorMessage))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
      );

    await renderScreen();

    expect(await screen.findByText(TAG_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(privateErrorMessage)).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TAGS }));
    expect(screen.getByText(LOADING_TAGS)).toBeTruthy();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);

    await act(async () => {
      resolveRetry(TAGS);
    });
    expect(screen.queryByText(TAG_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_TAGS)).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
    expect(loadMock).toHaveBeenCalledTimes(2);
    expect(recipeService.loadRecipe).toHaveBeenCalledTimes(1);
  });

  it.each(["loading", "failed"])("omits tags when saving other fields while tag loading is %s", async (status) => {
    const tagErrorMessage = "Tag request failed";
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, tags: [TAG_NAME] });

    const loadMock = jest.spyOn(tagService, "loadTags");
    if (status === "loading") loadMock.mockReturnValue(new Promise(() => {}));
    else loadMock.mockRejectedValue(new Error(tagErrorMessage));
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);

    await renderScreen();

    expect(await screen.findByText(status === "loading" ? LOADING_TAGS : TAG_ERROR_MESSAGE)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, expect.objectContaining({ title: EDITED_TITLE }));
    expect(saveMock.mock.calls[0][1]).not.toHaveProperty("tags");
  });
});

describe("RecipeEditScreen tag selection", () => {
  it("prefills saved tags, supports removal/reselection, and clears search after selecting", async () => {
    jest
      .spyOn(tagService, "loadTags")
      .mockResolvedValue({ items: [...TAGS.items, { id: "tag-two", name: QUICK_TAG_NAME }] });

    await renderScreen();

    expect(await screen.findByRole("button", { name: `Remove tag ${TAG_NAME}` })).toBeTruthy();

    const search = screen.getByLabelText("Search tags");
    await fireEvent.changeText(search, TAG_NAME);
    expect(screen.queryByRole("button", { name: `Select tag ${TAG_NAME}` })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: `Remove tag ${TAG_NAME}` }));
    expect(screen.queryByRole("button", { name: `Remove tag ${TAG_NAME}` })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: `Select tag ${TAG_NAME}` }));
    expect(search).toHaveDisplayValue("");

    await fireEvent.changeText(search, "qui");
    await fireEvent.press(screen.getByRole("button", { name: `Select tag ${QUICK_TAG_NAME}` }));
    expect(screen.getByRole("button", { name: `Remove tag ${TAG_NAME}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `Remove tag ${QUICK_TAG_NAME}` })).toBeTruthy();
    expect(search).toHaveDisplayValue("");
    expect(screen.queryByRole("button", { name: /^Create tag / })).toBeNull();
  });

  it("starts unselected and allows searching when the recipe has no tags", async () => {
    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [] }));
    jest.spyOn(tagService, "loadTags").mockResolvedValue(TAGS);

    await renderScreen();

    const search = await screen.findByLabelText("Search tags");
    expect(screen.queryByRole("button", { name: /^Remove tag / })).toBeNull();

    await fireEvent.changeText(search, TAG_NAME);
    expect(screen.getByRole("button", { name: `Select tag ${TAG_NAME}` })).toBeTruthy();
  });

  it("initializes saved selections when tags arrive before the recipe", async () => {
    let resolveRecipe!: (value: ReturnType<typeof makeRecipeDetailResponse>) => void;
    jest.spyOn(recipeService, "loadRecipe").mockReturnValue(
      new Promise((resolve) => {
        resolveRecipe = resolve;
      }),
    );
    jest.spyOn(tagService, "loadTags").mockResolvedValue(TAGS);

    await render(<RecipeEditScreen recipeId={RECIPE_ID} onSaved={jest.fn()} />);

    await act(async () => {
      resolveRecipe(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [TAG_NAME] }));
    });
    expect(await screen.findByRole("button", { name: `Remove tag ${TAG_NAME}` })).toBeTruthy();
  });

  it("keeps unmatched saved tags safe and retries without losing form edits", async () => {
    const saveTagsErrorMessage = "Unable to match saved tags. Please retry.";

    jest.spyOn(tagService, "loadTags").mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce(TAGS);
    const saveMock = jest
      .spyOn(recipeService, "saveRecipeChanges")
      .mockResolvedValue(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [TAG_NAME] }));

    await renderScreen();
    expect(await screen.findByText(saveTagsErrorMessage)).toBeTruthy();
    expect(screen.queryByLabelText("Search tags")).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(TITLE_LABEL), EDITED_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(saveMock.mock.calls[0][1]).not.toHaveProperty("tags");

    await fireEvent.press(screen.getByRole("button", { name: RETRY_TAGS }));
    expect(await screen.findByRole("button", { name: `Remove tag ${TAG_NAME}` })).toBeTruthy();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveDisplayValue(EDITED_TITLE);
  });
});

describe("RecipeEditScreen tag saving", () => {
  it.each([
    { action: "untouched", expected: [TAG_NAME] },
    { action: "replace", expected: [QUICK_TAG_NAME] },
    { action: "clear", expected: [] },
  ])("submits selected names: $action", async ({ action, expected }) => {
    jest
      .spyOn(tagService, "loadTags")
      .mockResolvedValue({ items: [...TAGS.items, { id: "tag-two", name: QUICK_TAG_NAME }] });
    const savedRecipe = makeRecipeDetailResponse({ id: RECIPE_ID, tags: expected });
    const saveMock = jest.spyOn(recipeService, "saveRecipeChanges").mockResolvedValue(savedRecipe);
    const onSaved = jest.fn();

    await render(<RecipeEditScreen recipeId={RECIPE_ID} onSaved={onSaved} />);

    await screen.findByRole("button", { name: `Remove tag ${TAG_NAME}` });
    if (action !== "untouched") await fireEvent.press(screen.getByRole("button", { name: `Remove tag ${TAG_NAME}` }));
    if (action === "replace") {
      await fireEvent.changeText(screen.getByLabelText("Search tags"), "qui");
      await fireEvent.press(screen.getByRole("button", { name: `Select tag ${QUICK_TAG_NAME}` }));
    }

    await fireEvent.changeText(screen.getByLabelText("Search tags"), "Unselected search text");
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(saveMock).toHaveBeenCalledWith(RECIPE_ID, expect.objectContaining({ tags: expected }));
    expect(onSaved).toHaveBeenCalledWith(savedRecipe);
  });

  it("disables search and both chip actions while saving and preserves selections after failure", async () => {
    const networkErrorMessage = "Network failure";

    jest
      .spyOn(tagService, "loadTags")
      .mockResolvedValue({ items: [...TAGS.items, { id: "tag-two", name: QUICK_TAG_NAME }] });
    let rejectSave!: (error: Error) => void;
    const pending = new Promise<ReturnType<typeof makeRecipeDetailResponse>>((_, reject) => {
      rejectSave = reject;
    });
    const saveMock = jest
      .spyOn(recipeService, "saveRecipeChanges")
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce(makeRecipeDetailResponse({ id: RECIPE_ID, tags: [QUICK_TAG_NAME] }));

    await renderScreen();

    await fireEvent.press(await screen.findByRole("button", { name: `Remove tag ${TAG_NAME}` }));
    await fireEvent.changeText(screen.getByLabelText("Search tags"), QUICK_TAG_NAME);
    await fireEvent.press(screen.getByRole("button", { name: `Select tag ${QUICK_TAG_NAME}` }));
    await fireEvent.changeText(screen.getByLabelText("Search tags"), TAG_NAME);
    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(screen.getByLabelText("Search tags")).toHaveProp("editable", false);
    expect(screen.getByRole("button", { name: `Select tag ${TAG_NAME}` })).toBeDisabled();
    expect(screen.getByRole("button", { name: `Remove tag ${QUICK_TAG_NAME}` })).toBeDisabled();

    await act(async () => {
      rejectSave(new Error(networkErrorMessage));
    });
    expect(screen.getByText("Unable to save changes. Please try again.")).toBeTruthy();
    expect(screen.getByLabelText("Search tags")).toHaveDisplayValue(TAG_NAME);
    expect(screen.getByLabelText("Search tags")).toHaveProp("editable", true);
    expect(screen.getByRole("button", { name: `Remove tag ${QUICK_TAG_NAME}` })).toBeEnabled();
    expect(screen.queryByRole("button", { name: `Remove tag ${TAG_NAME}` })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: SAVE_LABEL }));
    expect(saveMock).toHaveBeenNthCalledWith(2, RECIPE_ID, expect.objectContaining({ tags: [QUICK_TAG_NAME] }));
  });
});

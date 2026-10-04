import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { makeRecipeDetailResponse } from "@/test/fixtures/recipes";

import { RecipeDetailScreen } from "../recipe-detail-screen";
import * as recipeService from "../recipe-service";

const INGREDIENTS_HEADER_TEXT = "Ingredients";
const INSTRUCTIONS_HEADER_TEXT = "Instructions";
const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const NO_INGREDIENTS_TEXT = "No ingredients available";
const NO_INSTRUCTIONS_TEXT = "No instructions available";
const OPEN_LINK_ERROR_MESSAGE = "Unable to open original recipe. Please try again.";
const RECIPE_ID = "test_recipe_id";
const RECIPE_TITLE = "Chicken Wings";
const RETRY_TEXT = "Retry";
const SOURCE_DOMAIN = "example.com";
const SOURCE_LINK_TEXT = "Open original recipe";
const SOURCE_URL = "https://example.com/recipe";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const URL_ERROR_MESSAGE = "Cannot open URL";

const renderRecipeDetailScreen = async () => {
  await render(<RecipeDetailScreen recipeId={RECIPE_ID} />);
};

describe("RecipeDetailScreen", () => {
  it("loads the selected recipe and shows loading feedback", async () => {
    const loadMock = jest.spyOn(recipeService, "loadRecipe").mockImplementation(() => new Promise(() => {}));

    await renderRecipeDetailScreen();

    expect(screen.getByText(LOADING_RECIPE_TEXT)).toBeTruthy();
    expect(loadMock).toHaveBeenCalledWith(RECIPE_ID);
  });

  it("displays the loaded recipe title and removes loading feedback", async () => {
    const recipe = makeRecipeDetailResponse();

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(recipe.title)).toBeTruthy();
    expect(screen.queryByText(LOADING_RECIPE_TEXT)).toBeNull();
  });

  it("shows safe feedback when loading fails", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    jest.spyOn(recipeService, "loadRecipe").mockRejectedValue(error);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(LOAD_RECIPE_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(STORAGE_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_RECIPE_TEXT)).toBeNull();
    expect(screen.queryByText(RECIPE_TITLE)).toBeNull();
  });

  it("loads the recipe after retrying a failed request", async () => {
    const recipe = makeRecipeDetailResponse();

    const loadMock = jest
      .spyOn(recipeService, "loadRecipe")
      .mockRejectedValueOnce(new Error(STORAGE_ERROR_MESSAGE))
      .mockResolvedValueOnce(recipe);

    await renderRecipeDetailScreen();

    await screen.findByText(LOAD_RECIPE_ERROR_MESSAGE);
    await fireEvent.press(screen.getByRole("button", { name: RETRY_TEXT }));

    expect(await screen.findByText(recipe.title)).toBeTruthy();
    expect(screen.queryByText(LOAD_RECIPE_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByText(LOADING_RECIPE_TEXT)).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(2);
    expect(loadMock).toHaveBeenNthCalledWith(2, RECIPE_ID);
  });

  it("allows retrying again after a retry fails", async () => {
    const recipe = makeRecipeDetailResponse();
    const error = new Error(STORAGE_ERROR_MESSAGE);

    const loadMock = jest
      .spyOn(recipeService, "loadRecipe")
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(recipe);

    await renderRecipeDetailScreen();

    await fireEvent.press(await screen.findByRole("button", { name: RETRY_TEXT }));
    await fireEvent.press(await screen.findByRole("button", { name: RETRY_TEXT }));

    expect(await screen.findByText(recipe.title)).toBeTruthy();
    expect(loadMock).toHaveBeenCalledTimes(3);
  });

  it("shows loading feedback while a retry is pending", async () => {
    const error = new Error(STORAGE_ERROR_MESSAGE);

    const loadMock = jest
      .spyOn(recipeService, "loadRecipe")
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(() => new Promise(() => {}));

    await renderRecipeDetailScreen();

    await fireEvent.press(await screen.findByRole("button", { name: RETRY_TEXT }));

    expect(screen.getByText(LOADING_RECIPE_TEXT)).toBeTruthy();
    expect(screen.queryByText(LOAD_RECIPE_ERROR_MESSAGE)).toBeNull();
    expect(screen.queryByRole("button", { name: RETRY_TEXT })).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it("displays the recipe ingredients", async () => {
    const recipe = makeRecipeDetailResponse();
    const ingredientText = "2 cups flour";
    const ingredient2Text = "A pinch of salt";
    recipe.ingredients = [
      {
        position: 1,
        original_text: ingredientText,
        quantity: null,
        quantity_text: null,
        unit: null,
        name: null,
        preparation_note: null,
        is_optional: false,
        scale_locked: false,
        parse_status: "unparsed",
      },
      {
        position: 2,
        original_text: ingredient2Text,
        quantity: null,
        quantity_text: null,
        unit: null,
        name: null,
        preparation_note: null,
        is_optional: false,
        scale_locked: false,
        parse_status: "unparsed",
      },
    ];

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(INGREDIENTS_HEADER_TEXT)).toBeTruthy();
    expect(screen.getByText(ingredientText)).toBeTruthy();
    expect(screen.getByText(ingredient2Text)).toBeTruthy();
  });

  it("shows feedback when no ingredients are available", async () => {
    const recipe = makeRecipeDetailResponse();
    recipe.ingredients = [];

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(NO_INGREDIENTS_TEXT)).toBeTruthy();
    expect(screen.getByText(recipe.title)).toBeTruthy();
  });

  it("displays numbered recipe instructions", async () => {
    const recipe = makeRecipeDetailResponse();
    recipe.steps = [
      {
        position: 1,
        instruction: "Mix the ingredients.",
        section_title: null,
      },
      {
        position: 2,
        instruction: "Bake for 25 minutes.",
        section_title: null,
      },
    ];

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(INSTRUCTIONS_HEADER_TEXT)).toBeTruthy();
    expect(screen.getByText("1. Mix the ingredients.")).toBeTruthy();
    expect(screen.getByText("2. Bake for 25 minutes.")).toBeTruthy();
  });

  it("shows feedback when no instructions are available", async () => {
    const recipe = makeRecipeDetailResponse();
    recipe.steps = [];

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(NO_INSTRUCTIONS_TEXT)).toBeTruthy();
    expect(screen.getByText(recipe.title)).toBeTruthy();
  });

  it("shows the source domain when the recipe has a source URL", async () => {
    const recipe = makeRecipeDetailResponse({
      source_url: SOURCE_URL,
      source_domain: SOURCE_DOMAIN,
    });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(SOURCE_DOMAIN)).toBeTruthy();
  });

  it("hides the source attribution when no source URL is present", async () => {
    const recipe = makeRecipeDetailResponse({
      source_url: null,
      source_domain: SOURCE_DOMAIN,
    });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);

    await renderRecipeDetailScreen();

    expect(await screen.findByText(recipe.title)).toBeTruthy();
    expect(screen.queryByText(SOURCE_DOMAIN)).toBeNull();
    expect(screen.queryByRole("link", { name: SOURCE_LINK_TEXT })).toBeNull();
  });

  it("opens the original recipe when the source link is pressed", async () => {
    const recipe = makeRecipeDetailResponse({
      source_url: SOURCE_URL,
    });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const openURLMock = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    await renderRecipeDetailScreen();

    const openUrlLink = await screen.findByRole("link", { name: SOURCE_LINK_TEXT });
    await fireEvent.press(openUrlLink);

    expect(openURLMock).toHaveBeenCalledWith(SOURCE_URL);
  });

  it("shows an error when the original recipe cannot be opened", async () => {
    const error = new Error(URL_ERROR_MESSAGE);
    const recipe = makeRecipeDetailResponse({
      source_url: SOURCE_URL,
    });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    jest.spyOn(Linking, "openURL").mockRejectedValue(error);

    await renderRecipeDetailScreen();

    await fireEvent.press(await screen.findByRole("link", { name: SOURCE_LINK_TEXT }));

    expect(await screen.findByText(OPEN_LINK_ERROR_MESSAGE)).toBeTruthy();
  });

  it("clears the source-link error when opening is retried", async () => {
    const error = new Error(URL_ERROR_MESSAGE);
    const recipe = makeRecipeDetailResponse({
      source_url: SOURCE_URL,
    });

    jest.spyOn(recipeService, "loadRecipe").mockResolvedValue(recipe);
    const openURLMock = jest.spyOn(Linking, "openURL").mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);

    await renderRecipeDetailScreen();

    await fireEvent.press(await screen.findByRole("link", { name: SOURCE_LINK_TEXT }));
    await screen.findByText(OPEN_LINK_ERROR_MESSAGE);
    await fireEvent.press(await screen.findByRole("link", { name: SOURCE_LINK_TEXT }));

    expect(openURLMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(OPEN_LINK_ERROR_MESSAGE)).toBeNull();
  });
});

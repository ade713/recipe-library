import { fireEvent, render, screen } from "@testing-library/react-native";

import type { RecipeDetailResponse } from "@/types/recipe";

import { RecipeDetailScreen } from "../recipe-detail-screen";
import * as recipeService from "../recipe-service";

const RECIPE_ID = "test_recipe_id";
const RECIPE_TITLE = "Chicken Wings";
const IMAGE_URL = "https://example.com/chicken-wings";
const BASE_SERVINGS = "4";
const TIME_MINUTES = 35;
const LOADING_RECIPE_TEXT = "Loading recipe...";
const RETRY_TEXT = "Retry";
const STORAGE_ERROR_MESSAGE = "Secure storage unavailable";
const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const INGREDIENTS_HEADER_TEXT = "Ingredients";
const NO_INGREDIENTS_TEXT = "No ingredients available";
const INSTRUCTIONS_HEADER_TEXT = "Instructions";
const NO_INSTRUCTIONS_TEXT = "No instructions available";

const makeRecipeDetailResponse = (): RecipeDetailResponse => ({
  id: RECIPE_ID,
  title: RECIPE_TITLE,
  image_url: IMAGE_URL,
  total_time_minutes: TIME_MINUTES,
  base_servings: BASE_SERVINGS,
  is_favorite: false,
  tags: [],
  description: null,
  source_url: null,
  source_domain: null,
  source_site_name: null,
  source_author: null,
  prep_time_minutes: null,
  cook_time_minutes: null,
  servings_unit: null,
  ingredients: [],
  steps: [],
  tips: [],
});

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
});

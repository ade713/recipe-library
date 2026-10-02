import { fireEvent, render, screen } from "@testing-library/react-native";

import { makeRecipeSummary } from "@/test/fixtures/recipes";
import type { RecipeSummary } from "@/types/recipe";

import { RecipeSummaryCard } from "../recipe-summary-card";

const renderRecipeSummaryCard = async (recipe: RecipeSummary): Promise<void> => {
  await render(<RecipeSummaryCard recipe={recipe} />);
};

describe("RecipeSummaryCard", () => {
  it("renders the recipe title", async () => {
    const recipe = makeRecipeSummary();

    await renderRecipeSummaryCard(recipe);

    expect(screen.getByText(recipe.title)).toBeTruthy();
  });

  it("renders the total time when available", async () => {
    const recipe = makeRecipeSummary({ total_time_minutes: 35 });

    await renderRecipeSummaryCard(recipe);

    expect(screen.getByText("35 min")).toBeTruthy();
  });

  it("omits the total time when unknown", async () => {
    const recipe = makeRecipeSummary({ total_time_minutes: null });

    await renderRecipeSummaryCard(recipe);

    expect(screen.queryByText(/min$/)).toBeNull();
  });

  it("renders zero minutes", async () => {
    const recipe = makeRecipeSummary({ total_time_minutes: 0 });

    await renderRecipeSummaryCard(recipe);

    expect(screen.getByText("0 min")).toBeTruthy();
  });

  it("renders servings when available", async () => {
    const recipe = makeRecipeSummary({ base_servings: "4" });

    await renderRecipeSummaryCard(recipe);

    expect(screen.getByText("Servings: 4")).toBeTruthy();
  });

  it("omits servings when unknown", async () => {
    const recipe = makeRecipeSummary({ base_servings: null });

    await renderRecipeSummaryCard(recipe);

    expect(screen.queryByText(/^Servings:/)).toBeNull();
  });

  it("renders recipe tags", async () => {
    const recipe = makeRecipeSummary({ tags: ["Dinner", "Chicken"] });

    await renderRecipeSummaryCard(recipe);

    expect(screen.getByText("Dinner")).toBeTruthy();
    expect(screen.getByText("Chicken")).toBeTruthy();
  });

  it("shows a favorite indicator for favorite recipes", async () => {
    const recipe = makeRecipeSummary({ is_favorite: true });

    await renderRecipeSummaryCard(recipe);

    expect(screen.getByText("Favorite")).toBeTruthy();
  });

  it("omits the favorite indicator for non-favorite recipes", async () => {
    const recipe = makeRecipeSummary();

    await renderRecipeSummaryCard(recipe);

    expect(screen.queryByText("Favorite")).toBeNull();
  });

  it("renders the recipe image when available", async () => {
    const imageUrl = "https://example.com/chicken-wings.jpg";
    const recipe = makeRecipeSummary({ image_url: imageUrl });

    await renderRecipeSummaryCard(recipe);

    const image = screen.getByLabelText(`${recipe.title} photo`);

    expect(image).toHaveProp("source", { uri: imageUrl });
  });

  it("omits the recipe image when unavailable", async () => {
    const recipe = makeRecipeSummary({ image_url: null });

    await renderRecipeSummaryCard(recipe);

    expect(screen.queryByLabelText(`${recipe.title} photo`)).toBeNull();
    expect(screen.getByText(recipe.title)).toBeTruthy();
  });

  it("calls onPress when the recipe card is pressed", async () => {
    const recipe = makeRecipeSummary();
    const onPress = jest.fn();

    await render(<RecipeSummaryCard recipe={recipe} onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: `Open ${recipe.title}` }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not expose a button when no onPress is provided", async () => {
    const recipe = makeRecipeSummary();

    await renderRecipeSummaryCard(recipe);

    expect(screen.queryByRole("button", { name: `Open ${recipe.title}` })).toBeNull();
    expect(screen.getByText(recipe.title)).toBeTruthy();
  });
});

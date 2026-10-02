import { useEffect, useState } from "react";
import { Button, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RecipeDetailResponse } from "@/types/recipe";

import { loadRecipe } from "./recipe-service";

const INGREDIENTS_HEADER_TEXT = "Ingredients";
const INSTRUCTIONS_HEADER_TEXT = "Instructions";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const NO_INGREDIENTS_TEXT = "No ingredients available";
const NO_INSTRUCTIONS_TEXT = "No instructions available";
const RETRY_TEXT = "Retry";

type RecipeDetailScreenProps = {
  recipeId: string;
};

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps) {
  const [recipe, setRecipe] = useState<RecipeDetailResponse | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [loadRecipeError, setLoadRecipeError] = useState<string | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);

  const retryLoadingRecipe = (): void => {
    if (isLoadingRecipe) {
      return;
    }

    setIsLoadingRecipe(true);
    setLoadRecipeError(null);

    setLoadingAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    let active = true;

    setIsLoadingRecipe(true);
    setLoadRecipeError(null);
    setRecipe(null);

    const getRecipe = async (): Promise<void> => {
      try {
        const recipeDetailResponse = await loadRecipe(recipeId);

        if (active) {
          setRecipe(recipeDetailResponse);
        }
      } catch {
        if (active) {
          setLoadRecipeError(LOAD_RECIPE_ERROR_MESSAGE);
        }
      } finally {
        if (active) {
          setIsLoadingRecipe(false);
        }
      }
    };

    void getRecipe();

    return () => {
      active = false;
    };
  }, [recipeId, loadingAttempt]);

  if (loadRecipeError) {
    return (
      <>
        <Text>{loadRecipeError}</Text>
        <Button title={RETRY_TEXT} onPress={retryLoadingRecipe} />
      </>
    );
  }

  if (recipe !== null) {
    return (
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <ScrollView>
          <Text>{recipe.title}</Text>
          <Text>{INGREDIENTS_HEADER_TEXT}</Text>
          {recipe.ingredients.length === 0 ? (
            <Text>{NO_INGREDIENTS_TEXT}</Text>
          ) : (
            recipe.ingredients.map((ingredient) => <Text key={ingredient.position}>{ingredient.original_text}</Text>)
          )}
          <Text>{INSTRUCTIONS_HEADER_TEXT}</Text>
          {recipe.steps.length === 0 ? (
            <Text>{NO_INSTRUCTIONS_TEXT}</Text>
          ) : (
            recipe.steps.map((step) => <Text key={step.position}>{`${step.position}. ${step.instruction}`}</Text>)
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <Text>{LOADING_RECIPE_TEXT}</Text>;
}

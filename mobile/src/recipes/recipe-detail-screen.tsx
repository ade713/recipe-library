import { useEffect, useState } from "react";
import { Button, Text } from "react-native";

import type { RecipeDetailResponse } from "@/types/recipe";

import { loadRecipe } from "./recipe-service";

const LOADING_RECIPE_TEXT = "Loading recipe...";
const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
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
    return <Text>{recipe.title}</Text>;
  }

  return <Text>{LOADING_RECIPE_TEXT}</Text>;
}

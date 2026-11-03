import { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RecipeDetailResponse } from "@/types/recipe";

import { loadRecipe, saveRecipeChanges } from "./recipe-service";
import { RecipeEditForm } from "./recipe-edit-form";
import type { RecipeEditFormValues } from "./recipe-edit-form";

const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const RETRY_BUTTON = "Retry";

type RecipeEditScreenProps = {
  recipeId: string;
  onSaved: (recipe: RecipeDetailResponse) => void;
};

export function RecipeEditScreen({ recipeId, onSaved }: RecipeEditScreenProps) {
  const [recipe, setRecipe] = useState<RecipeDetailResponse | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [loadRecipeError, setLoadRecipeError] = useState<string | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(0);

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

  const handleSaveChanges = async (values: RecipeEditFormValues): Promise<void> => {
    const recipeDetailResponse = await saveRecipeChanges(recipeId, values);
    onSaved(recipeDetailResponse);
  };

  const retryLoadingRecipe = () => {
    if (isLoadingRecipe) {
      return;
    }

    setIsLoadingRecipe(true);
    setLoadRecipeError(null);

    setLoadingAttempt((attempt) => attempt + 1);
  };

  if (isLoadingRecipe) {
    return <Text>{LOADING_RECIPE_TEXT}</Text>;
  }

  if (loadRecipeError) {
    return (
      <>
        <Text style={styles.errorMessage}>{loadRecipeError}</Text>
        <Button title={RETRY_BUTTON} onPress={retryLoadingRecipe} />
      </>
    );
  }

  if (recipe !== null) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        <ScrollView keyboardShouldPersistTaps='handled'>
          <RecipeEditForm
            initialTitle={recipe.title}
            initialDescription={recipe.description}
            initialImageUrl={recipe.image_url}
            initialPrepTimeMinutes={recipe.prep_time_minutes}
            initialCookTimeMinutes={recipe.cook_time_minutes}
            initialTotalTimeMinutes={recipe.total_time_minutes}
            initialBaseServings={recipe.base_servings}
            initialServingsUnit={recipe.servings_unit}
            onSubmit={handleSaveChanges}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorMessage: {
    color: "#f32121",
  },
});

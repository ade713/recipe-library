import { useEffect, useState } from "react";
import { Button, Linking, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RecipeDetailResponse } from "@/types/recipe";

import { loadRecipe, updateRecipeFavorite } from "./recipe-service";

const ADD_FAVORITE_TEXT = "Add to favorites";
const INGREDIENTS_HEADER_TEXT = "Ingredients";
const INSTRUCTIONS_HEADER_TEXT = "Instructions";
const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const NO_INGREDIENTS_TEXT = "No ingredients available";
const NO_INSTRUCTIONS_TEXT = "No instructions available";
const OPEN_LINK_ERROR_MESSAGE = "Unable to open original recipe. Please try again.";
const REMOVE_FAVORITE_TEXT = "Remove from favorites";
const RETRY_TEXT = "Retry";
const SOURCE_LINK_TEXT = "Open original recipe";
const TIPS_HEADER_TEXT = "Source tips";
const UPDATE_FAVORITE_ERROR_MESSAGE = "Unable to update favorite. Please try again.";

type RecipeDetailScreenProps = {
  recipeId: string;
};

export function RecipeDetailScreen({ recipeId }: RecipeDetailScreenProps) {
  const [recipe, setRecipe] = useState<RecipeDetailResponse | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [loadRecipeError, setLoadRecipeError] = useState<string | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [openLinkError, setOpenLinkError] = useState<string | null>(null);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [updateFavoriteError, setUpdateFavoriteError] = useState<string | null>(null);

  const handleUpdateRecipeFavorite = async (): Promise<void> => {
    if (recipe === null || isUpdatingFavorite) {
      return;
    }

    setIsUpdatingFavorite(true);
    setUpdateFavoriteError(null);

    try {
      const updatedRecipe = await updateRecipeFavorite(recipe.id, !recipe.is_favorite);
      setRecipe(updatedRecipe);
    } catch {
      setUpdateFavoriteError(UPDATE_FAVORITE_ERROR_MESSAGE);
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  const handleOpenSourceLink = async (): Promise<void> => {
    const sourceUrl = recipe === null ? null : recipe.source_url;

    if (sourceUrl === null) {
      return;
    }

    setOpenLinkError(null);

    try {
      await Linking.openURL(sourceUrl);
    } catch {
      setOpenLinkError(OPEN_LINK_ERROR_MESSAGE);
    }
  };

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
    const sourceUrl = recipe.source_url;
    const shouldDisplaySourceDomain = sourceUrl !== null && recipe.source_domain !== null;
    const favoriteButtonTitle = recipe.is_favorite ? REMOVE_FAVORITE_TEXT : ADD_FAVORITE_TEXT;

    return (
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <ScrollView>
          <Text>{recipe.title}</Text>
          <Button title={favoriteButtonTitle} onPress={handleUpdateRecipeFavorite} disabled={isUpdatingFavorite} />
          {updateFavoriteError !== null && <Text>{updateFavoriteError}</Text>}

          {shouldDisplaySourceDomain && <Text>{recipe.source_domain}</Text>}
          {sourceUrl !== null && (
            <Pressable accessibilityRole='link' onPress={handleOpenSourceLink}>
              <Text>{SOURCE_LINK_TEXT}</Text>
            </Pressable>
          )}
          {openLinkError && <Text>{openLinkError}</Text>}

          {recipe.prep_time_minutes !== null && <Text>{`Prep: ${recipe.prep_time_minutes} mins`}</Text>}
          {recipe.cook_time_minutes !== null && <Text>{`Cook: ${recipe.cook_time_minutes} mins`}</Text>}
          {recipe.total_time_minutes !== null && <Text>{`Total: ${recipe.total_time_minutes} mins`}</Text>}
          {recipe.base_servings !== null &&
            (recipe.servings_unit !== null ? (
              <Text>{`Yield: ${recipe.base_servings} ${recipe.servings_unit}`}</Text>
            ) : (
              <Text>{`Servings: ${recipe.base_servings}`}</Text>
            ))}

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

          {recipe.tips.length > 0 && (
            <>
              <Text>{TIPS_HEADER_TEXT}</Text>
              {recipe.tips.map((tip) => (
                <Text key={tip.position}>{tip.tip}</Text>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <Text>{LOADING_RECIPE_TEXT}</Text>;
}

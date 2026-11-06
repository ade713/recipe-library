import { useEffect, useState } from "react";
import { Button, KeyboardAvoidingView, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loadTags } from "@/tags/tag-service";
import { SearchableTagPicker } from "@/tags/searchable-tag-picker";
import type { RecipeDetailResponse } from "@/types/recipe";
import type { TagResponse } from "@/types/tag";

import { loadRecipe, saveRecipeChanges } from "./recipe-service";
import { RecipeEditForm } from "./recipe-edit-form";
import type { RecipeEditFormValues } from "./recipe-edit-form";

const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const RETRY_BUTTON = "Retry";
const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
const TAGS_MATCH_ERROR_MESSAGE = "Unable to match saved tags. Please retry.";
const TAGS_LOADING_ERROR_MESSAGE = "Unable to load tags.";
const TAGS_LOADING_MESSAGE = "Loading tags...";

type RecipeEditScreenProps = {
  recipeId: string;
  headerHeight?: number;
  onSaved: (recipe: RecipeDetailResponse) => void;
};

export function RecipeEditScreen({ recipeId, headerHeight = 0, onSaved }: RecipeEditScreenProps) {
  const [recipe, setRecipe] = useState<RecipeDetailResponse | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [loadRecipeError, setLoadRecipeError] = useState<string | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagLoadingAttempt, setTagLoadingAttempt] = useState(0);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    setIsLoadingRecipe(true);
    setLoadRecipeError(null);
    setRecipe(null);
    setTagSearchTerm("");
    setSelectedTagIds(null);

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

  useEffect(() => {
    let active = true;

    setIsLoadingTags(true);
    setTagError(null);
    setTags([]);

    const getTags = async (): Promise<void> => {
      try {
        const response = await loadTags();
        if (active) {
          setTags(response.items);
        }
      } catch {
        if (active) {
          setTagError(TAGS_LOADING_ERROR_MESSAGE);
        }
      } finally {
        if (active) {
          setIsLoadingTags(false);
        }
      }
    };

    void getTags();

    return () => {
      active = false;
    };
  }, [recipeId, tagLoadingAttempt]);

  useEffect(() => {
    if (isLoadingRecipe || isLoadingTags || recipe === null || tagError !== null || selectedTagIds !== null) {
      return;
    }

    const initiliazeSelectedTagIds = () => {
      const currentSelectedTags = tags.filter((tag) => recipe.tags.includes(tag.name));
      if (currentSelectedTags.length !== recipe.tags.length) {
        setTagError(TAGS_MATCH_ERROR_MESSAGE);
        return;
      }

      const currentSelectedTagIds = currentSelectedTags.map((tag) => tag.id);
      setSelectedTagIds(currentSelectedTagIds);
    };

    initiliazeSelectedTagIds();
  }, [tags, recipe, isLoadingRecipe, isLoadingTags, tagError, selectedTagIds]);

  const handleSaveChanges = async (values: RecipeEditFormValues): Promise<void> => {
    setIsSaving(true);

    let selectedTagNames: string[] | undefined;
    if (!isLoadingTags && selectedTagIds !== null && tagError === null) {
      selectedTagNames = tags.filter((tag) => selectedTagIds.includes(tag.id)).map((tag) => tag.name);
    }

    const payload = selectedTagNames === undefined ? values : { ...values, tags: selectedTagNames };
    try {
      const recipeDetailResponse = await saveRecipeChanges(recipeId, payload);
      onSaved(recipeDetailResponse);
    } finally {
      setIsSaving(false);
    }
  };

  const retryLoadingRecipe = () => {
    if (isLoadingRecipe) {
      return;
    }

    setIsLoadingRecipe(true);
    setLoadRecipeError(null);

    setLoadingAttempt((attempt) => attempt + 1);
  };

  const retryLoadingTags = () => {
    if (isLoadingTags) {
      return;
    }

    setIsLoadingTags(true);
    setTagError(null);

    setTagLoadingAttempt((attempt) => attempt + 1);
  };

  const handleSelectTag = (newTagId: string): void => {
    setSelectedTagIds((currentTagIds) => {
      if (currentTagIds === null) {
        return null;
      }
      return currentTagIds.includes(newTagId) ? currentTagIds : [...currentTagIds, newTagId];
    });
    setTagSearchTerm("");
  };

  const handleRemoveTag = (removeTagId: string): void => {
    setSelectedTagIds((currentTagIds) => {
      if (currentTagIds === null) {
        return null;
      }
      return currentTagIds.filter((tagId) => tagId !== removeTagId);
    });
  };

  const handleChangeSearchInput = (searchText: string): void => {
    setTagSearchTerm(searchText);
  };

  const renderTagsSection = () => {
    if (isLoadingTags) {
      return <Text>{TAGS_LOADING_MESSAGE}</Text>;
    }

    if (tagError !== null) {
      return (
        <>
          <Text style={styles.errorMessage}>{tagError}</Text>
          <Button
            accessibilityLabel={RETRY_TAGS_BUTTON_LABEL}
            title={RETRY_TAGS_BUTTON_LABEL}
            onPress={retryLoadingTags}
          />
        </>
      );
    }

    if (selectedTagIds === null) {
      return null;
    }

    return (
      <SearchableTagPicker
        tags={tags}
        selectedTagIds={selectedTagIds}
        searchTerm={tagSearchTerm}
        disabled={isSaving}
        onSearchChange={handleChangeSearchInput}
        onSelectTag={handleSelectTag}
        onRemoveTag={handleRemoveTag}
      />
    );
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
        <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={headerHeight} style={styles.container}>
          <ScrollView keyboardShouldPersistTaps='handled'>
            {renderTagsSection()}
            <RecipeEditForm
              initialTitle={recipe.title}
              initialDescription={recipe.description}
              initialImageUrl={recipe.image_url}
              initialPrepTimeMinutes={recipe.prep_time_minutes}
              initialCookTimeMinutes={recipe.cook_time_minutes}
              initialTotalTimeMinutes={recipe.total_time_minutes}
              initialBaseServings={recipe.base_servings}
              initialServingsUnit={recipe.servings_unit}
              initialIsFavorite={recipe.is_favorite}
              onSubmit={handleSaveChanges}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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

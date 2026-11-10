import { useEffect, useState } from "react";
import { Button, KeyboardAvoidingView, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SearchableTagPicker } from "@/tags/searchable-tag-picker";
import { useAvailableTags } from "@/tags/use-available-tags";
import { useTagCreation } from "@/tags/use-tag-creation";
import type { RecipeDetailResponse } from "@/types/recipe";

import { loadRecipe, saveRecipeChanges } from "./recipe-service";
import { RecipeEditForm } from "./recipe-edit-form";
import type { RecipeEditFormValues } from "./recipe-edit-form";

const CREATING_TAG_MESSAGE = "Creating tag...";
const LOAD_RECIPE_ERROR_MESSAGE = "Unable to load recipe.";
const LOADING_RECIPE_TEXT = "Loading recipe...";
const RETRY_BUTTON = "Retry";
const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
const TAGS_LOADING_MESSAGE = "Loading tags...";
const TAGS_MATCH_ERROR_MESSAGE = "Unable to match saved tags. Please retry.";

type RecipeEditScreenProps = {
  recipeId: string;
  headerHeight?: number;
  onSaved: (recipe: RecipeDetailResponse) => void;
};

export function RecipeEditScreen({ recipeId, headerHeight = 0, onSaved }: RecipeEditScreenProps) {
  const {
    tags,
    isLoadingTags,
    tagError: tagLoadingError,
    retryLoadingTags: reloadTags,
    addTag,
  } = useAvailableTags(recipeId);

  const [recipe, setRecipe] = useState<RecipeDetailResponse | null>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(true);
  const [loadRecipeError, setLoadRecipeError] = useState<string | null>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [tagMatchError, setTagMatchError] = useState<string | null>(null);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { newTagName, canCreateTag, nameError, isCreatingTag, tagCreateError, createTag, clearTagCreateError } =
    useTagCreation({
      tags,
      searchTerm: tagSearchTerm,
      disabled: isSaving,
      onCreated: (tag) => {
        addTag(tag);
        handleSelectTag(tag.id);
      },
    });

  const tagError = tagLoadingError ?? tagMatchError;

  useEffect(() => {
    let active = true;

    setIsLoadingRecipe(true);
    setLoadRecipeError(null);
    setRecipe(null);
    setTagSearchTerm("");
    setTagMatchError(null);
    setSelectedTagIds(null);
    clearTagCreateError();

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
  }, [recipeId, loadingAttempt, clearTagCreateError]);

  useEffect(() => {
    if (isLoadingRecipe || isLoadingTags || recipe === null || tagError !== null || selectedTagIds !== null) {
      return;
    }

    const currentSelectedTags = tags.filter((tag) => recipe.tags.includes(tag.name));
    if (currentSelectedTags.length !== recipe.tags.length) {
      setTagMatchError(TAGS_MATCH_ERROR_MESSAGE);
      return;
    }

    const currentSelectedTagIds = currentSelectedTags.map((tag) => tag.id);
    setSelectedTagIds(currentSelectedTagIds);
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

    setTagMatchError(null);
    clearTagCreateError();
    reloadTags();
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
    clearTagCreateError();
    setTagSearchTerm(searchText);
  };

  const renderCreateTagButton = () => {
    if (!canCreateTag) {
      return null;
    }

    return (
      <Button
        accessibilityLabel={`Create tag ${newTagName}`}
        title={`Create ${newTagName}`}
        disabled={isCreatingTag || isSaving}
        onPress={() => {
          void createTag();
        }}
      />
    );
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
      <>
        <SearchableTagPicker
          tags={tags}
          selectedTagIds={selectedTagIds}
          searchTerm={tagSearchTerm}
          disabled={isSaving || isCreatingTag}
          onSearchChange={handleChangeSearchInput}
          onSelectTag={handleSelectTag}
          onRemoveTag={handleRemoveTag}
        />

        {nameError !== null && <Text>{nameError}</Text>}
        {renderCreateTagButton()}
        {isCreatingTag && <Text>{CREATING_TAG_MESSAGE}</Text>}
        {tagCreateError !== null && <Text style={styles.errorMessage}>{tagCreateError}</Text>}
      </>
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
              initialSteps={recipe.steps}
              initialIsFavorite={recipe.is_favorite}
              saveDisabled={isCreatingTag}
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

import { useState } from "react";
import { Button, KeyboardAvoidingView, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useRouter } from "expo-router";

import { ApiError } from "@/api/errors";
import { saveTag } from "@/tags/tag-service";
import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import { SearchableTagPicker } from "@/tags/searchable-tag-picker";
import { useAvailableTags } from "@/tags/use-available-tags";
import type { RecipeCreateRequest } from "@/types/recipe";

const CREATING_TAG_MESSAGE = "Creating tag...";
const MAX_TAG_LENGTH = 50;
const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
const TAG_CREATE_ERROR_MESSAGE = "Unable to create tag. Please try again.";
const TAG_DUPLICATE_ERROR_MESSAGE = "A tag with this name already exists.";
const TAG_NAME_LENGTH_ERROR_MESSAGE = "Tag names must be 50 characters or fewer.";
const TAGS_HEADER = "Tags";
const TAGS_LOADING_MESSAGE = "Loading tags...";

export default function NewRecipeScreen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();

  const { tags, isLoadingTags, tagError, retryLoadingTags, addTag } = useAvailableTags();

  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [tagCreateError, setTagCreateError] = useState<string | null>(null);

  const handleCreateTag = async (): Promise<void> => {
    if (isCreatingTag) {
      return;
    }

    const newTagName = tagSearchTerm.trim();
    if (newTagName.length === 0) {
      return;
    }
    if (Array.from(newTagName).length > MAX_TAG_LENGTH) {
      return;
    }
    if (tags.some((tag) => tag.name.toLowerCase() === newTagName.toLowerCase())) {
      return;
    }

    setIsCreatingTag(true);
    setTagCreateError(null);

    try {
      const response = await saveTag(newTagName);
      addTag(response);
      handleSelectTag(response.id);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setTagCreateError(TAG_DUPLICATE_ERROR_MESSAGE);
      } else {
        setTagCreateError(TAG_CREATE_ERROR_MESSAGE);
      }
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSelectTag = (newTagId: string): void => {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(newTagId) ? currentTagIds : [...currentTagIds, newTagId],
    );
    setTagSearchTerm("");
  };

  const handleRemoveTag = (removeTagId: string): void => {
    setSelectedTagIds((currentTagIds) => currentTagIds.filter((tagId) => tagId !== removeTagId));
  };

  const handleChangeSearchInput = (searchText: string): void => {
    setTagCreateError(null);
    setTagSearchTerm(searchText);
  };

  const handleSaveRecipe = async (values: RecipeCreateRequest): Promise<void> => {
    const selectedTagNames = tags.filter((tag) => selectedTagIds.includes(tag.id)).map((tag) => tag.name);
    const payload = { ...values, tags: selectedTagNames };
    const recipe = await saveRecipe(payload);
    router.replace(`/recipes/${recipe.id}`);
  };

  const renderCreateTagButton = () => {
    const newTagName = tagSearchTerm.trim();
    if (newTagName.length === 0) {
      return null;
    }

    if (Array.from(newTagName).length > MAX_TAG_LENGTH) {
      return null;
    }

    if (tags.some((tag) => tag.name.toLowerCase() === newTagName.toLowerCase())) {
      return null;
    }

    return (
      <Button
        accessibilityLabel={`Create tag ${newTagName}`}
        title={`Create ${newTagName}`}
        disabled={isCreatingTag}
        onPress={() => {
          void handleCreateTag();
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
          <Text>{tagError}</Text>
          <Button
            accessibilityLabel={RETRY_TAGS_BUTTON_LABEL}
            title={RETRY_TAGS_BUTTON_LABEL}
            onPress={retryLoadingTags}
          />
        </>
      );
    }

    return (
      <>
        <SearchableTagPicker
          tags={tags}
          selectedTagIds={selectedTagIds}
          searchTerm={tagSearchTerm}
          searchDisabled={isCreatingTag}
          onSearchChange={handleChangeSearchInput}
          onSelectTag={handleSelectTag}
          onRemoveTag={handleRemoveTag}
        />

        {Array.from(tagSearchTerm.trim()).length > MAX_TAG_LENGTH && <Text>{TAG_NAME_LENGTH_ERROR_MESSAGE}</Text>}
        {renderCreateTagButton()}
        {isCreatingTag && <Text>{CREATING_TAG_MESSAGE}</Text>}
        {tagCreateError !== null && <Text>{tagCreateError}</Text>}
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={headerHeight} style={styles.container}>
        <ScrollView keyboardShouldPersistTaps='handled'>
          <Text>{TAGS_HEADER}</Text>
          {renderTagsSection()}
          <RecipeCreateForm onSubmit={handleSaveRecipe} disabled={isCreatingTag} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

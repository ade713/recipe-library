import { useState } from "react";
import { Button, KeyboardAvoidingView, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useRouter } from "expo-router";

import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import { SearchableTagPicker } from "@/tags/searchable-tag-picker";
import { useAvailableTags } from "@/tags/use-available-tags";
import { useTagCreation } from "@/tags/use-tag-creation";
import type { RecipeCreateRequest } from "@/types/recipe";

const CREATING_TAG_MESSAGE = "Creating tag...";
const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
const TAGS_HEADER = "Tags";
const TAGS_LOADING_MESSAGE = "Loading tags...";

export default function NewRecipeScreen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();

  const { tags, isLoadingTags, tagError, retryLoadingTags, addTag } = useAvailableTags();

  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { newTagName, canCreateTag, nameError, isCreatingTag, tagCreateError, createTag, clearTagCreateError } =
    useTagCreation({
      tags,
      searchTerm: tagSearchTerm,
      onCreated: (tag) => {
        addTag(tag);
        handleSelectTag(tag.id);
      },
    });

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
    clearTagCreateError();
    setTagSearchTerm(searchText);
  };

  const handleSaveRecipe = async (values: RecipeCreateRequest): Promise<void> => {
    const selectedTagNames = tags.filter((tag) => selectedTagIds.includes(tag.id)).map((tag) => tag.name);
    const payload = { ...values, tags: selectedTagNames };
    const recipe = await saveRecipe(payload);
    router.replace(`/recipes/${recipe.id}`);
  };

  const renderCreateTagButton = () => {
    if (!canCreateTag) {
      return null;
    }

    return (
      <Button
        accessibilityLabel={`Create tag ${newTagName}`}
        title={`Create ${newTagName}`}
        disabled={isCreatingTag}
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

        {nameError !== null && <Text>{nameError}</Text>}
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

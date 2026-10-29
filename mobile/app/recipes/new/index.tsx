import { useEffect, useState } from "react";
import { Button, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useRouter } from "expo-router";

import { ApiError } from "@/api/errors";
import { loadTags, saveTag } from "@/tags/tag-service";
import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import type { RecipeCreateRequest } from "@/types/recipe";
import type { TagResponse } from "@/types/tag";

const CREATING_TAG_MESSAGE = "Creating tag...";
const MAX_TAG_LENGTH = 50;
const MAX_TAG_SUGGESTIONS = 5;
const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
const TAG_CREATE_ERROR_MESSAGE = "Unable to create tag. Please try again.";
const TAG_DUPLICATE_ERROR_MESSAGE = "A tag with this name already exists.";
const TAG_NAME_LENGTH_ERROR_MESSAGE = "Tag names must be 50 characters or fewer.";
const TAGS_EMPTY_MESSAGE = "No tags yet.";
const TAGS_HEADER = "Tags";
const TAGS_LOADING_ERROR_MESSAGE = "Unable to load tags.";
const TAGS_LOADING_MESSAGE = "Loading tags...";
const TAGS_SEARCH_EMPTY_MESSAGE = "No matching tags.";
const TAGS_SEARCH_LABEL = "Search tags";
const TAGS_SEARCH_PLACEHOLDER = "Search Tags";

export default function NewRecipeScreen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagLoadingAttempt, setTagLoadingAttempt] = useState(0);
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
      const result = await saveTag(newTagName);

      setTags((currentTags) => [...currentTags, result]);
      handleSelectTag(result.id);
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

  useEffect(() => {
    let active = true;

    setIsLoadingTags(true);
    setTagError(null);

    const getTags = async (): Promise<void> => {
      try {
        const result = await loadTags();
        if (active) {
          setTags(result.items);
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
  }, [tagLoadingAttempt]);

  const retryLoadingTags = () => {
    if (isLoadingTags) {
      return;
    }

    setIsLoadingTags(true);
    setTagError(null);

    setTagLoadingAttempt((attempt) => attempt + 1);
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

  const renderMatchingTags = () => {
    const normalizedSearchTerm = tagSearchTerm.trim().toLowerCase();
    if (normalizedSearchTerm.length === 0) {
      return null;
    }

    const matchingTags = tags
      .filter((tag) => tag.name.toLowerCase().includes(normalizedSearchTerm) && !selectedTagIds.includes(tag.id))
      .slice(0, MAX_TAG_SUGGESTIONS);

    if (matchingTags.length === 0) {
      return <Text>{TAGS_SEARCH_EMPTY_MESSAGE}</Text>;
    }

    return (
      <View style={styles.tagRow}>
        {matchingTags.map((tag) => (
          <Pressable
            key={tag.id}
            accessibilityRole='button'
            accessibilityLabel={`Select tag ${tag.name}`}
            onPress={() => handleSelectTag(tag.id)}
            style={styles.tagButton}
          >
            <Text style={styles.matchingTag}>{tag.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  };

  const renderSelectedTags = () => {
    return (
      <View style={styles.tagRow}>
        {selectedTagIds.map((tagId) => {
          const tag = tags.find((tag) => tag.id === tagId);
          if (tag === undefined) {
            return null;
          }

          return (
            <Pressable
              key={tagId}
              accessibilityRole='button'
              accessibilityLabel={`Remove tag ${tag.name}`}
              onPress={() => handleRemoveTag(tagId)}
              style={[styles.tagButton, styles.selectedTag]}
            >
              <Text>{`${tag.name} x`}</Text>
            </Pressable>
          );
        })}
      </View>
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
        {selectedTagIds.length > 0 && renderSelectedTags()}
        <TextInput
          accessibilityLabel={TAGS_SEARCH_LABEL}
          placeholder={TAGS_SEARCH_PLACEHOLDER}
          autoCorrect={false}
          autoCapitalize='none'
          editable={!isCreatingTag}
          value={tagSearchTerm}
          onChangeText={(searchText) => handleChangeSearchInput(searchText)}
          style={[styles.formInput, isCreatingTag && styles.disabledInput]}
        />

        {tags.length === 0 && <Text>{TAGS_EMPTY_MESSAGE}</Text>}
        {renderMatchingTags()}

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
  formInput: {
    minWidth: 0,
    borderRadius: 2,
    borderColor: "#2196F3",
    borderWidth: 1,
    borderStyle: "solid",
    marginTop: 2,
    marginBottom: 2,
  },
  disabledInput: {
    backgroundColor: "#F0F0F0",
    borderColor: "#BDBDBD",
    color: "#757575",
  },
  tagButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
    borderWidth: 1,
    borderRadius: 15,
  },
  matchingTag: {
    color: "#FFF",
  },
  selectedTag: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
});

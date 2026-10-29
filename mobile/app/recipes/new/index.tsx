import { useEffect, useState } from "react";
import { Button, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useRouter } from "expo-router";

import { loadTags } from "@/tags/tag-service";
import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import type { RecipeCreateRequest } from "@/types/recipe";
import type { TagResponse } from "@/types/tag";

const MAX_TAG_SUGGESTIONS = 5;
const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
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

  const handleSelectTag = (newTagId: string): void => {
    setSelectedTagIds((currentTagIds) =>
      currentTagIds.includes(newTagId) ? currentTagIds : [...currentTagIds, newTagId],
    );
    setTagSearchTerm("");
  };

  const handleRemoveTag = (removeTagId: string): void => {
    setSelectedTagIds((currentTagIds) => currentTagIds.filter((tagId) => tagId !== removeTagId));
  };

  const handleSaveRecipe = async (values: RecipeCreateRequest) => {
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
    if (tags.length === 0) {
      return <Text>{TAGS_EMPTY_MESSAGE}</Text>;
    }

    return (
      <>
        {selectedTagIds.length > 0 && renderSelectedTags()}
        <TextInput
          accessibilityLabel={TAGS_SEARCH_LABEL}
          placeholder={TAGS_SEARCH_PLACEHOLDER}
          autoCorrect={false}
          autoCapitalize='none'
          value={tagSearchTerm}
          onChangeText={setTagSearchTerm}
          style={styles.formInput}
        />

        {renderMatchingTags()}
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={headerHeight} style={styles.container}>
        <ScrollView keyboardShouldPersistTaps='handled'>
          <Text>{TAGS_HEADER}</Text>
          {renderTagsSection()}
          <RecipeCreateForm onSubmit={handleSaveRecipe} />
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

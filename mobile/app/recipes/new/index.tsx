import { useEffect, useState } from "react";
import { Button, KeyboardAvoidingView, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useRouter } from "expo-router";

import { loadTags } from "@/tags/tag-service";
import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import type { RecipeCreateRequest } from "@/types/recipe";
import type { TagResponse } from "@/types/tag";

const RETRY_TAGS_BUTTON_LABEL = "Retry tags";
const TAGS_EMPTY_MESSAGE = "No tags yet.";
const TAGS_HEADER = "Tags";
const TAGS_LOADING_ERROR_MESSAGE = "Unable to load tags.";
const TAGS_LOADING_MESSAGE = "Loading tags...";

export default function NewRecipeScreen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagLoadingAttempt, setTagLoadingAttempt] = useState(0);

  const handleSaveRecipe = async (values: RecipeCreateRequest) => {
    const recipe = await saveRecipe(values);
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
        {tags.map((tag) => (
          <Text key={tag.id}>{tag.name}</Text>
        ))}
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
});

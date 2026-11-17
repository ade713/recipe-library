import { useState } from "react";
import { Button, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RecipeImportPreviewResponse } from "@/types/import";

import { ImportUrlForm } from "./import-url-form";
import { loadImportPreview } from "./import-service";

const PREVIEW_BLOCKED_MESSAGE = "This website blocked the import or could not be accessed safely.";
const PREVIEW_DUPLICATE_MESSAGE = "This recipe is already in your library.";
const PREVIEW_FAILED_MESSAGE = "No recipe preview could be created.";
const PREVIEW_PARTIAL_MESSAGE = "Preview ready with missing information.";
const PREVIEW_SUCCESS_MESSAGE = "Preview ready.";
const STATUS_BLOCKED = "blocked";
const STATUS_DUPLICATE = "duplicate";
const STATUS_FAILED = "failed";
const STATUS_PARTIAL = "partial";
const STATUS_SUCCESS = "success";
const ACTION_OPEN_EXISTING = "open_existing";
const ACTION_ENTER_MANUALLY = "enter_manually";
const ENTER_MANUALLY_LABEL = "Enter manually";
const OPEN_EXISTING_RECIPE_LABEL = "Open existing recipe";

type ImportRecipeScreenProps = {
  headerHeight?: number;
  onEnterManually?: () => void;
  onOpenExisting?: (recipeId: string) => void;
};

export function ImportRecipeScreen({ headerHeight = 0, onEnterManually, onOpenExisting }: ImportRecipeScreenProps) {
  const [importPreview, setImportPreview] = useState<RecipeImportPreviewResponse | null>(null);

  const handlePreview = async (url: string): Promise<void> => {
    setImportPreview(null);

    const response = await loadImportPreview({ url });
    setImportPreview(response);
  };

  const renderImportPreview = () => {
    if (importPreview === null) {
      return null;
    }

    const existingRecipeId = importPreview.existing_recipe_id;
    const shouldDisplayOpenExistingRecipeButton =
      existingRecipeId !== null &&
      existingRecipeId.trim().length > 0 &&
      onOpenExisting !== undefined &&
      importPreview.next_actions.includes(ACTION_OPEN_EXISTING);

    const shouldDisplayEnterManuallyButton =
      onEnterManually !== undefined && importPreview.next_actions.includes(ACTION_ENTER_MANUALLY);

    const previewDraft = importPreview.draft;
    const shouldDisplayPreview =
      (importPreview.status === STATUS_SUCCESS || importPreview.status === STATUS_PARTIAL) && previewDraft !== null;

    const statusFeedback = (): string => {
      switch (importPreview.status) {
        case STATUS_SUCCESS:
          return PREVIEW_SUCCESS_MESSAGE;
        case STATUS_PARTIAL:
          return PREVIEW_PARTIAL_MESSAGE;
        case STATUS_BLOCKED:
          return PREVIEW_BLOCKED_MESSAGE;
        case STATUS_FAILED:
          return PREVIEW_FAILED_MESSAGE;
        case STATUS_DUPLICATE:
          return PREVIEW_DUPLICATE_MESSAGE;
        default:
          return "";
      }
    };

    return (
      <View>
        <View style={styles.section}>
          <Text>{statusFeedback()}</Text>
          {importPreview.warnings.map((warning, index) => (
            <Text key={index} style={styles.errorMessage}>
              {warning}
            </Text>
          ))}
        </View>

        {shouldDisplayOpenExistingRecipeButton && (
          <Button
            accessibilityLabel={OPEN_EXISTING_RECIPE_LABEL}
            title={OPEN_EXISTING_RECIPE_LABEL}
            onPress={() => onOpenExisting(existingRecipeId)}
          />
        )}

        {shouldDisplayEnterManuallyButton && (
          <Button accessibilityLabel={ENTER_MANUALLY_LABEL} title={ENTER_MANUALLY_LABEL} onPress={onEnterManually} />
        )}

        {shouldDisplayPreview && (
          <View>
            <Text style={styles.section}>{previewDraft.title}</Text>

            <View style={styles.section}>
              {previewDraft.ingredients.map((ingredient) => (
                <Text key={ingredient.position}>{ingredient.original_text}</Text>
              ))}
            </View>

            <View style={styles.section}>
              {previewDraft.steps.map((step) => (
                <Text key={step.position}>
                  {step.position}. {step.instruction}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={headerHeight} style={styles.container}>
        <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.contentContainer}>
          <ImportUrlForm onSubmit={handlePreview} />

          {renderImportPreview()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 4,
  },
  section: {
    marginBottom: 12,
  },
  errorMessage: {
    color: "#f32121",
  },
});

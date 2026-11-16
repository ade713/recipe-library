import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
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

type ImportRecipeScreenProps = {
  headerHeight?: number;
};

export function ImportRecipeScreen({ headerHeight = 0 }: ImportRecipeScreenProps) {
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

        {(importPreview.status === STATUS_SUCCESS || importPreview.status === STATUS_PARTIAL) &&
          importPreview.draft !== null && (
            <View>
              <Text style={styles.section}>{importPreview.draft.title}</Text>

              <View style={styles.section}>
                {importPreview.draft.ingredients.map((ingredient) => (
                  <Text key={ingredient.position}>{ingredient.original_text}</Text>
                ))}
              </View>

              <View style={styles.section}>
                {importPreview.draft.steps.map((step) => (
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

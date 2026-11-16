import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RecipeImportPreviewResponse } from "@/types/import";

import { ImportUrlForm } from "./import-url-form";
import { loadImportPreview } from "./import-service";

const PREVIEW_SUCCESS_MESSAGE = "Preview ready.";
const PREVIEW_PARTIAL_MESSAGE = "Preview ready with missing information.";
const PREVIEW_BLOCKED_MESSAGE = "This website blocked the import or could not be accessed safely.";
const PREVIEW_FAILED_MESSAGE = "No recipe preview could be created.";
const PREVIEW_DUPLICATE_MESSAGE = "This recipe is already in your library.";
const STATUS_PARTIAL = "partial";
const STATUS_SUCCESS = "success";
const STATUS_BLOCKED = "blocked";
const STATUS_FAILED = "failed";
const STATUS_DUPLICATE = "duplicate";

export function ImportRecipeScreen() {
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
        <Text>{statusFeedback()}</Text>
        {importPreview.warnings.map((warning, index) => (
          <Text key={index} style={styles.errorMessage}>
            {warning}
          </Text>
        ))}

        {(importPreview.status === STATUS_SUCCESS || importPreview.status === STATUS_PARTIAL) &&
          importPreview.draft !== null && (
            <View>
              <Text>{importPreview.draft.title}</Text>

              {importPreview.draft.ingredients.map((ingredient) => (
                <Text key={ingredient.position}>{ingredient.original_text}</Text>
              ))}

              {importPreview.draft.steps.map((step) => (
                <Text key={step.position}>
                  {step.position}. {step.instruction}
                </Text>
              ))}
            </View>
          )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ImportUrlForm onSubmit={handlePreview} />

      {renderImportPreview()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorMessage: {
    color: "#f32121",
  },
});

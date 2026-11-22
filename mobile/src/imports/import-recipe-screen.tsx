import { useEffect, useState } from "react";
import { Button, KeyboardAvoidingView, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecipeEditForm } from "@/recipes/recipe-edit-form";
import type { RecipeEditFormValues } from "@/recipes/recipe-edit-form";
import type { RecipeImportPreviewResponse } from "@/types/import";

import { formatImportDraft } from "./format-import-draft";
import { ImportUrlForm } from "./import-url-form";
import { loadImportPreview, saveImportDraft } from "./import-service";
import { useAvailableTags } from "@/tags/use-available-tags";
import { SearchableTagPicker } from "@/tags/searchable-tag-picker";

const ACTION_ENTER_MANUALLY = "enter_manually";
const ACTION_IMPORT_AS_COPY = "import_as_copy";
const ACTION_OPEN_EXISTING = "open_existing";
const ACTION_OPEN_SOURCE_URL = "open_source_url";
const COPY_ERROR_MESSAGE = "Unable to preview recipe as a copy. Please try again.";
const ENTER_MANUALLY_LABEL = "Enter manually";
const IMPORT_AS_COPY_LABEL = "Import as copy";
const OPEN_EXISTING_RECIPE_LABEL = "Open existing recipe";
const OPEN_SOURCE_URL_LABEL = "Open source URL";
const PREVIEW_BLOCKED_MESSAGE = "This website blocked the import or could not be accessed safely.";
const PREVIEW_DUPLICATE_MESSAGE = "This recipe is already in your library.";
const PREVIEW_FAILED_MESSAGE = "No recipe preview could be created.";
const PREVIEW_PARTIAL_MESSAGE = "Preview ready with missing information.";
const PREVIEW_SUCCESS_MESSAGE = "Preview ready.";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const SAVE_RECIPE_LABEL = "Save recipe";
const SOURCE_URL_ERROR_MESSAGE = "Unable to open source URL. Please try again.";
const STATUS_BLOCKED = "blocked";
const STATUS_DUPLICATE = "duplicate";
const STATUS_FAILED = "failed";
const STATUS_PARTIAL = "partial";
const STATUS_SUCCESS = "success";
const TAGS_LOADING_MESSAGE = "Loading tags...";

type ImportRecipeScreenProps = {
  headerHeight?: number;
  onEnterManually?: () => void;
  onOpenExisting?: (recipeId: string) => void;
  onSaved?: (recipeId: string) => void;
};

export function ImportRecipeScreen({
  headerHeight = 0,
  onEnterManually,
  onOpenExisting,
  onSaved,
}: ImportRecipeScreenProps) {
  const [importPreview, setImportPreview] = useState<RecipeImportPreviewResponse | null>(null);
  const [isImportingAsCopy, setIsImportingAsCopy] = useState(false);
  const [copyErrorMessage, setCopyErrorMessage] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceUrlErrorMessage, setSourceUrlErrorMessage] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[] | null>(null);

  const { tags, isLoadingTags } = useAvailableTags(importPreview?.import_id);

  const isImportActionPending = isImportingAsCopy || isSavingDraft;

  useEffect(() => {
    if (importPreview === null || importPreview.draft === null || isLoadingTags || selectedTagIds !== null) {
      return;
    }

    const previewDraft = importPreview.draft;
    const currentSelectedTags = tags.filter((tag) => previewDraft.tags.includes(tag.name));
    const currentSelectedTagIds = currentSelectedTags.map((tag) => tag.id);
    setSelectedTagIds(currentSelectedTagIds);
  }, [importPreview, tags, isLoadingTags, selectedTagIds]);

  const handleSaveDraft = async (values: RecipeEditFormValues): Promise<void> => {
    if (
      isSavingDraft ||
      importPreview === null ||
      importPreview.draft === null ||
      (importPreview.status !== STATUS_SUCCESS && importPreview.status !== STATUS_PARTIAL)
    ) {
      return;
    }

    setIsSavingDraft(true);

    try {
      const formattedDraft = formatImportDraft(importPreview.draft, values);
      if (!isLoadingTags && selectedTagIds !== null) {
        const selectedTagNames = tags.filter((tag) => selectedTagIds.includes(tag.id)).map((tag) => tag.name);
        formattedDraft.tags = selectedTagNames;
      }

      const savedRecipe = await saveImportDraft(importPreview.import_id, formattedDraft);
      onSaved?.(savedRecipe.id);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleOpenSourceUrl = async (): Promise<void> => {
    if (sourceUrl.trim() === "") {
      return;
    }

    setSourceUrlErrorMessage(null);

    try {
      await Linking.openURL(sourceUrl);
    } catch {
      setSourceUrlErrorMessage(SOURCE_URL_ERROR_MESSAGE);
    }
  };

  const handleImportAsCopy = async (): Promise<void> => {
    if (isImportActionPending) {
      return;
    }

    setIsImportingAsCopy(true);
    setCopyErrorMessage(null);

    try {
      const response = await loadImportPreview({ url: sourceUrl, import_as_copy: true });
      setImportPreview(response);
      setSelectedTagIds(null);
      setTagSearchTerm("");
    } catch {
      setCopyErrorMessage(COPY_ERROR_MESSAGE);
    } finally {
      setIsImportingAsCopy(false);
    }
  };

  const handlePreview = async (url: string): Promise<void> => {
    if (isImportActionPending) {
      return;
    }

    setImportPreview(null);
    setCopyErrorMessage(null);
    setSourceUrlErrorMessage(null);
    setSourceUrl(url);
    setSelectedTagIds(null);
    setTagSearchTerm("");

    const response = await loadImportPreview({ url });
    setImportPreview(response);
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

    const statusMessage = statusFeedback();
    const visibleWarnings = importPreview.warnings.filter((warning) => warning.trim() !== statusMessage.trim());

    return (
      <View>
        <View style={styles.section}>
          <Text>{statusMessage}</Text>
          {visibleWarnings.map((warning, index) => (
            <Text key={index} style={styles.errorMessage}>
              {warning}
            </Text>
          ))}
        </View>

        {importPreview.next_actions.includes(ACTION_IMPORT_AS_COPY) && (
          <>
            {copyErrorMessage !== null && <Text style={styles.errorMessage}>{copyErrorMessage}</Text>}
            <Button
              accessibilityLabel={IMPORT_AS_COPY_LABEL}
              title={IMPORT_AS_COPY_LABEL}
              disabled={isImportActionPending}
              onPress={() => {
                void handleImportAsCopy();
              }}
            />
          </>
        )}

        {shouldDisplayOpenExistingRecipeButton && (
          <Button
            accessibilityLabel={OPEN_EXISTING_RECIPE_LABEL}
            title={OPEN_EXISTING_RECIPE_LABEL}
            disabled={isImportActionPending}
            onPress={() => onOpenExisting(existingRecipeId)}
          />
        )}

        {shouldDisplayEnterManuallyButton && (
          <Button
            accessibilityLabel={ENTER_MANUALLY_LABEL}
            title={ENTER_MANUALLY_LABEL}
            disabled={isImportActionPending}
            onPress={onEnterManually}
          />
        )}

        {shouldDisplayPreview && (
          <RecipeEditForm
            initialTitle={previewDraft.title}
            initialDescription={previewDraft.description}
            initialImageUrl={previewDraft.image_url}
            initialPrepTimeMinutes={previewDraft.prep_time_minutes}
            initialCookTimeMinutes={previewDraft.cook_time_minutes}
            initialTotalTimeMinutes={previewDraft.total_time_minutes}
            initialBaseServings={previewDraft.base_servings}
            initialServingsUnit={previewDraft.servings_unit}
            initialIngredients={previewDraft.ingredients}
            initialSteps={previewDraft.steps}
            initialTips={previewDraft.tips}
            initialIsFavorite={previewDraft.is_favorite}
            saveLabel={SAVE_RECIPE_LABEL}
            saveErrorMessage={SAVE_RECIPE_ERROR_MESSAGE}
            onSubmit={handleSaveDraft}
          />
        )}

        {importPreview.next_actions.includes(ACTION_OPEN_SOURCE_URL) && (
          <>
            {sourceUrlErrorMessage !== null && <Text style={styles.errorMessage}>{sourceUrlErrorMessage}</Text>}
            <Button
              accessibilityLabel={OPEN_SOURCE_URL_LABEL}
              title={OPEN_SOURCE_URL_LABEL}
              disabled={isImportActionPending}
              onPress={handleOpenSourceUrl}
            />
          </>
        )}
      </View>
    );
  };

  const renderTagsSelection = () => {
    if (
      importPreview === null ||
      importPreview.draft === null ||
      (importPreview.status !== STATUS_SUCCESS && importPreview.status !== STATUS_PARTIAL)
    ) {
      return null;
    }

    if (isLoadingTags) {
      return <Text>{TAGS_LOADING_MESSAGE}</Text>;
    }

    if (selectedTagIds === null) {
      return null;
    }

    return (
      <SearchableTagPicker
        tags={tags}
        selectedTagIds={selectedTagIds}
        searchTerm={tagSearchTerm}
        disabled={isImportActionPending}
        onSearchChange={handleChangeSearchInput}
        onSelectTag={handleSelectTag}
        onRemoveTag={handleRemoveTag}
      />
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={headerHeight} style={styles.container}>
        <ScrollView keyboardShouldPersistTaps='handled' contentContainerStyle={styles.contentContainer}>
          <ImportUrlForm disabled={isImportActionPending} onSubmit={handlePreview} />

          {renderImportPreview()}
          {renderTagsSelection()}
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

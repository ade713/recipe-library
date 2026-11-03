import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const DESCRIPTION_LABEL = "Description (optional)";
const MAX_TITLE_LENGTH = 255;
const SAVE_LABEL = "Save changes";
const SAVE_UPDATE_ERROR = "Unable to save changes. Please try again.";
const TITLE_BLANK_ERROR = "Enter a recipe title.";
const TITLE_LABEL = "Recipe title";
const TITLE_LENGTH_ERROR = "Recipe titles must be 255 characters or fewer.";

export type RecipeEditFormValues = {
  title: string;
  description: string | null;
};

type RecipeEditFormProps = {
  initialTitle: string;
  initialDescription?: string | null;
  onSubmit: (values: RecipeEditFormValues) => Promise<void>;
};

export function RecipeEditForm({ initialTitle, initialDescription, onSubmit }: RecipeEditFormProps) {
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const [currentDescription, setCurrentDescription] = useState(initialDescription ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = currentTitle.trim();

    if (trimmedTitle.length === 0) {
      setErrorMessage(TITLE_BLANK_ERROR);
      return;
    }
    if (Array.from(trimmedTitle).length > MAX_TITLE_LENGTH) {
      setErrorMessage(TITLE_LENGTH_ERROR);
      return;
    }

    const trimmedDescription = currentDescription.trim();
    const normalizedDescription = trimmedDescription.length > 0 ? trimmedDescription : null;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit({ title: trimmedTitle, description: normalizedDescription });
    } catch {
      setErrorMessage(SAVE_UPDATE_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      {errorMessage !== null && <Text style={styles.errorMessage}>{errorMessage}</Text>}
      <TextInput
        accessibilityLabel={TITLE_LABEL}
        editable={!isSubmitting}
        value={currentTitle}
        autoCorrect={false}
        onChangeText={setCurrentTitle}
        style={styles.formInput}
      />

      <TextInput
        accessibilityLabel={DESCRIPTION_LABEL}
        editable={!isSubmitting}
        value={currentDescription}
        multiline={true}
        textAlignVertical='top'
        autoCorrect={false}
        onChangeText={setCurrentDescription}
        style={[styles.formInput, styles.descriptionInput]}
      />

      <Button
        accessibilityLabel={SAVE_LABEL}
        title={SAVE_LABEL}
        disabled={isSubmitting}
        onPress={() => {
          void handleSubmit();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formInput: {
    minWidth: 0,
    borderRadius: 2,
    borderColor: "#2196F3",
    borderWidth: 1,
    borderStyle: "solid",
    marginTop: 2,
    marginBottom: 2,
  },
  descriptionInput: {
    minHeight: 96,
  },
  errorMessage: {
    color: "#f32121",
  },
});

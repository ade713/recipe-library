import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const TITLE_BLANK_ERROR = "Enter a recipe title.";
const TITLE_LENGTH_ERROR = "Recipe titles must be 255 characters or fewer.";
const SAVE_LABEL = "Save changes";
const SAVE_UPDATE_ERROR = "Unable to save changes. Please try again.";
const MAX_TITLE_LENGTH = 255;
const TITLE_LABEL = "Recipe title";

type RecipeTitleEditFormProps = {
  initialTitle: string;
  onSubmit: (values: { title: string }) => Promise<void>;
};

export function RecipeTitleEditForm({ initialTitle, onSubmit }: RecipeTitleEditFormProps) {
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
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

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit({ title: trimmedTitle });
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
        onChangeText={setCurrentTitle}
        style={styles.formInput}
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
  errorMessage: {
    color: "#f32121",
  },
});

import { useState } from "react";
import { TextInput, View, StyleSheet, Button, Text } from "react-native";

const PREVIEW_LABEL = "Preview recipe";
const URL_PLACEHOLDER = "Enter Recipe URL Here";
const IMPORT_URL_ERROR_MESSAGE = "Unable to preview recipe. Please try again.";
const URL_LABEL = "Recipe URL";
const URL_VALIDATION_ERROR_MESSAGE = "Enter a valid HTTP or HTTPS recipe URL.";

const parseHttpUrl = (value: string): string => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new Error(URL_VALIDATION_ERROR_MESSAGE);
  }

  const url = new URL(trimmedValue);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(URL_VALIDATION_ERROR_MESSAGE);
  }

  return trimmedValue;
};

type ImportUrlFormProps = {
  onSubmit: (url: string) => Promise<void>;
};

export function ImportUrlForm({ onSubmit }: ImportUrlFormProps) {
  const [recipeUrl, setRecipeUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }

    let parsedUrl: string;
    try {
      parsedUrl = parseHttpUrl(recipeUrl);
    } catch {
      setErrorMessage(URL_VALIDATION_ERROR_MESSAGE);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit(parsedUrl);
    } catch {
      setErrorMessage(IMPORT_URL_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      {errorMessage !== null && <Text style={styles.errorMessage}>{errorMessage}</Text>}

      <TextInput
        accessibilityLabel={URL_LABEL}
        placeholder={URL_PLACEHOLDER}
        editable={!isSubmitting}
        keyboardType='url'
        value={recipeUrl}
        autoCapitalize='none'
        autoCorrect={false}
        onChangeText={setRecipeUrl}
        style={styles.formInput}
      />
      <Button
        accessibilityLabel={PREVIEW_LABEL}
        title={PREVIEW_LABEL}
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
  errorMessage: {
    color: "#f32121",
  },
});

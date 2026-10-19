import { useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const TITLE_INPUT_LABEL = "Recipe title";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";

type RecipeCreateFormValues = {
  title: string;
};

type RecipeCreateFormProps = {
  onSubmit: (values: RecipeCreateFormValues) => Promise<void>;
};

export function RecipeCreateForm({ onSubmit }: RecipeCreateFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) {
      return;
    }

    if (title.trim() === "") {
      setErrorMessage(ENTER_TITLE_ERROR_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({ title });
    } catch {
      setErrorMessage(SAVE_RECIPE_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      {errorMessage !== null && <Text>{errorMessage}</Text>}
      <TextInput accessibilityLabel={TITLE_INPUT_LABEL} value={title} autoCorrect={false} onChangeText={setTitle} />
      <Button title={SAVE_BUTTON_LABEL} disabled={isSubmitting} onPress={handleSubmit} />
    </View>
  );
}

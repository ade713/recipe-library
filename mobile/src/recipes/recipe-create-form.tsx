import { useRef, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const REMOVE_INGREDIENT_LABEL = "Remove ingredient";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const TITLE_INPUT_LABEL = "Recipe title";

type IngredientRow = {
  id: number;
  text: string;
};

type RecipeCreateFormValues = {
  title: string;
  ingredients: {
    position: number;
    original_text: string;
  }[];
};

type RecipeCreateFormProps = {
  onSubmit: (values: RecipeCreateFormValues) => Promise<void>;
};

export function RecipeCreateForm({ onSubmit }: RecipeCreateFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ id: 0, text: "" }]);
  const rowId = useRef(0);

  const handleAddIngredient = () => {
    rowId.current++;
    const newRow = { id: rowId.current, text: "" };
    setIngredients((currentRows) => [...currentRows, newRow]);
  };

  const handleRemoveIngredient = (removeRowId: number) => {
    setIngredients((currentRows) => currentRows.filter((row) => row.id !== removeRowId));
  };

  const handleChangeIngredient = (editedRowId: number, newText: string): void => {
    setIngredients((currentRows) =>
      currentRows.map((row) => (row.id === editedRowId ? { ...row, text: newText } : row)),
    );
  };

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

    const formattedIngredients = ingredients
      .filter((ingredient) => ingredient.text.trim().length > 0)
      .map((ingredient, idx) => ({
        position: idx + 1,
        original_text: ingredient.text.trim(),
      }));

    try {
      await onSubmit({ title, ingredients: formattedIngredients });
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

      {ingredients.map((row, idx) => (
        <View key={row.id} style={styles.ingredientRow}>
          <TextInput
            accessibilityLabel={`Ingredient ${idx + 1}`}
            value={row.text}
            autoCorrect={false}
            onChangeText={(text) => handleChangeIngredient(row.id, text)}
            style={styles.ingredientInput}
          />
          <Button
            title={REMOVE_INGREDIENT_LABEL}
            accessibilityLabel={`Remove ingredient ${idx + 1}`}
            onPress={() => handleRemoveIngredient(row.id)}
          />
        </View>
      ))}
      <Button title={ADD_INGREDIENT_LABEL} onPress={handleAddIngredient} />

      <Button title={SAVE_BUTTON_LABEL} disabled={isSubmitting} onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ingredientInput: {
    flex: 1,
    minWidth: 0,
  },
});

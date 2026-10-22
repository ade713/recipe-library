import { useRef, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ADD_STEP_LABEL = "Add step";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const REMOVE_INGREDIENT_LABEL = "Remove ingredient";
const REMOVE_STEP_LABEL = "Remove step";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const TITLE_INPUT_LABEL = "Recipe title";

type FormTextRow = {
  id: number;
  text: string;
};

type RecipeCreateFormValues = {
  title: string;
  ingredients: {
    position: number;
    original_text: string;
  }[];
  steps: {
    position: number;
    instruction: string;
  }[];
};

type RecipeCreateFormProps = {
  onSubmit: (values: RecipeCreateFormValues) => Promise<void>;
};

export function RecipeCreateForm({ onSubmit }: RecipeCreateFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<FormTextRow[]>([{ id: 0, text: "" }]);
  const [steps, setSteps] = useState<FormTextRow[]>([{ id: 0, text: "" }]);
  const ingredientRowId = useRef(0);
  const stepRowId = useRef(0);

  const handleAddIngredient = () => {
    ingredientRowId.current++;
    const newRow = { id: ingredientRowId.current, text: "" };
    setIngredients((currentRows) => [...currentRows, newRow]);
  };

  const handleAddStep = () => {
    stepRowId.current++;
    const newRow = { id: stepRowId.current, text: "" };
    setSteps((currentRows) => [...currentRows, newRow]);
  };

  const handleRemoveIngredient = (removeRowId: number) => {
    setIngredients((currentRows) => currentRows.filter((row) => row.id !== removeRowId));
  };

  const handleRemoveStep = (removeRowId: number) => {
    setSteps((currentRows) => currentRows.filter((row) => row.id !== removeRowId));
  };

  const handleChangeIngredient = (editedRowId: number, newText: string): void => {
    setIngredients((currentRows) =>
      currentRows.map((row) => (row.id === editedRowId ? { ...row, text: newText } : row)),
    );
  };

  const handleChangeStep = (editedRowId: number, newText: string): void => {
    setSteps((currentRows) => currentRows.map((row) => (row.id === editedRowId ? { ...row, text: newText } : row)));
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

    const formattedSteps = steps
      .filter((step) => step.text.trim().length > 0)
      .map((step, idx) => ({
        position: idx + 1,
        instruction: step.text.trim(),
      }));

    try {
      await onSubmit({ title, ingredients: formattedIngredients, steps: formattedSteps });
    } catch {
      setErrorMessage(SAVE_RECIPE_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      {errorMessage !== null && <Text>{errorMessage}</Text>}
      <TextInput
        accessibilityLabel={TITLE_INPUT_LABEL}
        placeholder='Enter Title Here'
        value={title}
        autoCorrect={false}
        onChangeText={setTitle}
        style={styles.formInput}
      />

      {ingredients.map((row, idx) => (
        <View key={row.id} style={styles.formTextRow}>
          <TextInput
            accessibilityLabel={`Ingredient ${idx + 1}`}
            placeholder='Enter Ingredient Here'
            value={row.text}
            autoCorrect={false}
            onChangeText={(text) => handleChangeIngredient(row.id, text)}
            style={[styles.formInput, styles.rowInput]}
          />
          <Button
            title={REMOVE_INGREDIENT_LABEL}
            accessibilityLabel={`${REMOVE_INGREDIENT_LABEL} ${idx + 1}`}
            onPress={() => handleRemoveIngredient(row.id)}
          />
        </View>
      ))}
      <Button title={ADD_INGREDIENT_LABEL} onPress={handleAddIngredient} />

      {steps.map((row, idx) => (
        <View key={row.id} style={styles.formTextRow}>
          <TextInput
            accessibilityLabel={`Step ${idx + 1}`}
            placeholder='Enter Step Here'
            multiline={true}
            textAlignVertical='top'
            value={row.text}
            autoCorrect={false}
            onChangeText={(text) => handleChangeStep(row.id, text)}
            style={[styles.formInput, styles.rowInput]}
          />
          <Button
            title={REMOVE_STEP_LABEL}
            accessibilityLabel={`${REMOVE_STEP_LABEL} ${idx + 1}`}
            onPress={() => handleRemoveStep(row.id)}
          />
        </View>
      ))}
      <Button title={ADD_STEP_LABEL} onPress={handleAddStep} />

      <Button title={SAVE_BUTTON_LABEL} disabled={isSubmitting} onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  formTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  rowInput: {
    flex: 1,
  },
});

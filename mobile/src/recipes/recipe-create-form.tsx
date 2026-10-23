import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { RecipeFormTextRow } from "./recipe-form-text-row";
import { useFormTextRows } from "./use-form-text-rows";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ADD_STEP_LABEL = "Add step";
const ADD_TIP_LABEL = "Add tip";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const REMOVE_INGREDIENT_LABEL = "Remove ingredient";
const REMOVE_STEP_LABEL = "Remove step";
const REMOVE_TIP_LABEL = "Remove tip";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const TITLE_INPUT_LABEL = "Recipe title";

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
  tips: {
    position: number;
    tip: string;
  }[];
};

type RecipeCreateFormProps = {
  onSubmit: (values: RecipeCreateFormValues) => Promise<void>;
};

export function RecipeCreateForm({ onSubmit }: RecipeCreateFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    rows: ingredients,
    addRow: handleAddIngredient,
    removeRow: handleRemoveIngredient,
    updateRow: handleChangeIngredient,
  } = useFormTextRows();
  const {
    rows: steps,
    addRow: handleAddStep,
    removeRow: handleRemoveStep,
    updateRow: handleChangeStep,
  } = useFormTextRows();
  const {
    rows: tips,
    addRow: handleAddTip,
    removeRow: handleRemoveTip,
    updateRow: handleChangeTip,
  } = useFormTextRows();

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

    const formattedTips = tips
      .filter((tip) => tip.text.trim().length > 0)
      .map((tip, idx) => ({
        position: idx + 1,
        tip: tip.text.trim(),
      }));

    try {
      await onSubmit({
        title,
        ingredients: formattedIngredients,
        steps: formattedSteps,
        tips: formattedTips,
      });
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
        <RecipeFormTextRow
          key={row.id}
          label={`Ingredient ${idx + 1}`}
          placeholder='Enter Ingredient Here'
          value={row.text}
          multiline={false}
          autoFocus={row.id !== 0}
          removeLabel={`${REMOVE_INGREDIENT_LABEL} ${idx + 1}`}
          removeTitle={REMOVE_INGREDIENT_LABEL}
          onChangeText={(text) => handleChangeIngredient(row.id, text)}
          onRemove={() => handleRemoveIngredient(row.id)}
        />
      ))}
      <Button title={ADD_INGREDIENT_LABEL} onPress={handleAddIngredient} />

      {steps.map((row, idx) => (
        <RecipeFormTextRow
          key={row.id}
          label={`Step ${idx + 1}`}
          placeholder='Enter Step Here'
          value={row.text}
          multiline={true}
          autoFocus={row.id !== 0}
          removeLabel={`${REMOVE_STEP_LABEL} ${idx + 1}`}
          removeTitle={REMOVE_STEP_LABEL}
          onChangeText={(text) => handleChangeStep(row.id, text)}
          onRemove={() => handleRemoveStep(row.id)}
        />
      ))}
      <Button title={ADD_STEP_LABEL} onPress={handleAddStep} />

      {tips.map((row, idx) => (
        <RecipeFormTextRow
          key={row.id}
          label={`Tip ${idx + 1}`}
          placeholder='Enter Tip Here'
          value={row.text}
          multiline={true}
          autoFocus={row.id !== 0}
          removeLabel={`${REMOVE_TIP_LABEL} ${idx + 1}`}
          removeTitle={REMOVE_TIP_LABEL}
          onChangeText={(text) => handleChangeTip(row.id, text)}
          onRemove={() => handleRemoveTip(row.id)}
        />
      ))}
      <Button title={ADD_TIP_LABEL} onPress={handleAddTip} />

      <Button title={SAVE_BUTTON_LABEL} disabled={isSubmitting} onPress={handleSubmit} />
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
});

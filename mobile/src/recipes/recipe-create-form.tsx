import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

import { RecipeFormTextRow } from "./recipe-form-text-row";
import { useFormTextRows } from "./use-form-text-rows";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ADD_STEP_LABEL = "Add step";
const ADD_TIP_LABEL = "Add tip";
const COOK_TEXT = "Cook";
const COOK_TIME_LABEL = "Cook time (minutes)";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const INVALID_TIME_MESSAGE = "Enter times as whole minutes, zero or greater.";
const PREP_TEXT = "Prep";
const PREP_TIME_LABEL = "Prep time (minutes)";
const REMOVE_INGREDIENT_LABEL = "Remove ingredient";
const REMOVE_STEP_LABEL = "Remove step";
const REMOVE_TIP_LABEL = "Remove tip";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const TIME_HEADING = "Times (minutes)";
const TITLE_INPUT_LABEL = "Recipe title";
const TOTAL_TEXT = "Total";
const TOTAL_TIME_LABEL = "Total time (minutes)";

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
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
};

type RecipeCreateFormProps = {
  onSubmit: (values: RecipeCreateFormValues) => Promise<void>;
};

const parseOptionalMinutes = (value: string): number | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  const minutes = Number(trimmedValue);
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new Error(INVALID_TIME_MESSAGE);
  }

  return minutes;
};

export function RecipeCreateForm({ onSubmit }: RecipeCreateFormProps) {
  const [title, setTitle] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [totalTime, setTotalTime] = useState("");
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

    let times: Pick<RecipeCreateFormValues, "prep_time_minutes" | "cook_time_minutes" | "total_time_minutes">;

    try {
      times = {
        prep_time_minutes: parseOptionalMinutes(prepTime),
        cook_time_minutes: parseOptionalMinutes(cookTime),
        total_time_minutes: parseOptionalMinutes(totalTime),
      };
    } catch {
      setErrorMessage(INVALID_TIME_MESSAGE);
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
        ...times,
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

      <Text>{TIME_HEADING}</Text>
      <View style={styles.timesRow}>
        <View style={styles.timeField}>
          <Text>{PREP_TEXT}</Text>
          <TextInput
            accessibilityLabel={PREP_TIME_LABEL}
            value={prepTime}
            onChangeText={setPrepTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.timeInput]}
          />
        </View>

        <View style={styles.timeField}>
          <Text>{COOK_TEXT}</Text>
          <TextInput
            accessibilityLabel={COOK_TIME_LABEL}
            value={cookTime}
            onChangeText={setCookTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.timeInput]}
          />
        </View>

        <View style={styles.timeField}>
          <Text>{TOTAL_TEXT}</Text>
          <TextInput
            accessibilityLabel={TOTAL_TIME_LABEL}
            value={totalTime}
            onChangeText={setTotalTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.timeInput]}
          />
        </View>
      </View>

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
  timesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  timeField: {
    flex: 1,
    minWidth: 0,
  },
  timeInput: {
    minHeight: 48,
    paddingHorizontal: 8,
  },
});

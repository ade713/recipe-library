import { useState } from "react";
import { Button, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { RecipeFormTextRow } from "./recipe-form-text-row";
import { useFormTextRows } from "./use-form-text-rows";

const ADD_INGREDIENT_LABEL = "Add ingredient";
const ADD_STEP_LABEL = "Add step";
const ADD_TIP_LABEL = "Add tip";
const COOK_TEXT = "Cook";
const COOK_TIME_LABEL = "Cook time (minutes)";
const DESCRIPTION_LABEL = "Description (optional)";
const DESCRIPTION_PLACEHOLDER = "Enter Description Here";
const ENTER_TITLE_ERROR_MESSAGE = "Enter a recipe title.";
const FAVORITE_LABEL = "Favorite";
const IMAGE_URL_LABEL = "Image URL (optional)";
const INGREDIENT_PLACEHOLDER = "Enter Ingredient Here";
const INVALID_IMAGE_URL_MESSAGE = "Enter a valid HTTP or HTTPS image URL.";
const INVALID_PROTOCOL_MESSAGE = "Expected an HTTP or HTTPS URL.";
const INVALID_SERVINGS_MESSAGE = "Enter a servings or yield quantity of zero or greater.";
const INVALID_SOURCE_URL_MESSAGE = "Enter a valid HTTP or HTTPS recipe URL.";
const INVALID_TIME_MESSAGE = "Enter times as whole minutes, zero or greater.";
const PREP_TEXT = "Prep";
const PREP_TIME_LABEL = "Prep time (minutes)";
const REMOVE_INGREDIENT_LABEL = "Remove ingredient";
const REMOVE_STEP_LABEL = "Remove step";
const REMOVE_TIP_LABEL = "Remove tip";
const SAVE_BUTTON_LABEL = "Save recipe";
const SAVE_RECIPE_ERROR_MESSAGE = "Unable to save recipe. Please try again.";
const SERVINGS_HEADING = "Servings / yield";
const SERVINGS_LABEL = "Servings or yield quantity";
const SERVINGS_QUANTITY_TEXT = "Quantity";
const SERVINGS_UNIT_LABEL = "Yield unit (optional)";
const SERVINGS_UNIT_TEXT = "Unit (optional)";
const SOURCE_URL_LABEL = "Original recipe URL (optional)";
const STEP_PLACEHOLDER = "Enter Step Here";
const TIME_HEADING = "Times (minutes)";
const TIP_PLACEHOLDER = "Enter Tip Here";
const TITLE_INPUT_LABEL = "Recipe title";
const TITLE_PLACEHOLDER = "Enter Title Here";
const TOTAL_TEXT = "Total";
const TOTAL_TIME_LABEL = "Total time (minutes)";
const URL_PLACEHOLDER = "Enter URL Here";

type RecipeCreateFormValues = {
  title: string;
  description?: string;
  source_url?: string;
  image_url?: string;
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
  base_servings?: number;
  servings_unit?: string;
  is_favorite: boolean;
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

const parseOptionalServings = (value: string): number | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  const servings = Number(trimmedValue);
  if (servings < 0 || !Number.isFinite(servings)) {
    throw new Error(INVALID_SERVINGS_MESSAGE);
  }

  return servings;
};

const parseOptionalHttpUrl = (value: string): string | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  const url = new URL(trimmedValue);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(INVALID_PROTOCOL_MESSAGE);
  }

  return trimmedValue;
};

export function RecipeCreateForm({ onSubmit }: RecipeCreateFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [totalTime, setTotalTime] = useState("");
  const [servings, setServings] = useState("");
  const [servingsUnit, setServingsUnit] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
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

    let parsedServings: number | undefined;
    try {
      parsedServings = parseOptionalServings(servings);
    } catch {
      setErrorMessage(INVALID_SERVINGS_MESSAGE);
      return;
    }

    let parsedSourceUrl: string | undefined;
    try {
      parsedSourceUrl = parseOptionalHttpUrl(sourceUrl);
    } catch {
      setErrorMessage(INVALID_SOURCE_URL_MESSAGE);
      return;
    }

    let parsedImageUrl: string | undefined;
    try {
      parsedImageUrl = parseOptionalHttpUrl(imageUrl);
    } catch {
      setErrorMessage(INVALID_IMAGE_URL_MESSAGE);
      return;
    }

    const normalizedDescription = description.trim() || undefined;
    const normalizedUnit = servingsUnit.trim() || undefined;

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
        source_url: parsedSourceUrl,
        image_url: parsedImageUrl,
        description: normalizedDescription,
        ingredients: formattedIngredients,
        steps: formattedSteps,
        tips: formattedTips,
        base_servings: parsedServings,
        servings_unit: normalizedUnit,
        is_favorite: isFavorite,
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
        placeholder={TITLE_PLACEHOLDER}
        value={title}
        autoCorrect={false}
        onChangeText={setTitle}
        style={styles.formInput}
      />

      <Text>{DESCRIPTION_LABEL}</Text>
      <TextInput
        accessibilityLabel={DESCRIPTION_LABEL}
        placeholder={DESCRIPTION_PLACEHOLDER}
        value={description}
        multiline={true}
        textAlignVertical='top'
        autoCorrect={false}
        onChangeText={setDescription}
        style={[styles.formInput, styles.descriptionInput]}
      />

      <Text>{SOURCE_URL_LABEL}</Text>
      <TextInput
        accessibilityLabel={SOURCE_URL_LABEL}
        placeholder={URL_PLACEHOLDER}
        value={sourceUrl}
        autoCapitalize='none'
        autoCorrect={false}
        keyboardType='url'
        onChangeText={setSourceUrl}
        style={styles.formInput}
      />

      <Text>{IMAGE_URL_LABEL}</Text>
      <TextInput
        accessibilityLabel={IMAGE_URL_LABEL}
        placeholder={URL_PLACEHOLDER}
        value={imageUrl}
        autoCapitalize='none'
        autoCorrect={false}
        keyboardType='url'
        onChangeText={setImageUrl}
        style={styles.formInput}
      />

      <Text>{TIME_HEADING}</Text>
      <View style={styles.fieldsRow}>
        <View style={styles.fieldColumn}>
          <Text>{PREP_TEXT}</Text>
          <TextInput
            accessibilityLabel={PREP_TIME_LABEL}
            value={prepTime}
            onChangeText={setPrepTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>

        <View style={styles.fieldColumn}>
          <Text>{COOK_TEXT}</Text>
          <TextInput
            accessibilityLabel={COOK_TIME_LABEL}
            value={cookTime}
            onChangeText={setCookTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>

        <View style={styles.fieldColumn}>
          <Text>{TOTAL_TEXT}</Text>
          <TextInput
            accessibilityLabel={TOTAL_TIME_LABEL}
            value={totalTime}
            onChangeText={setTotalTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>
      </View>

      <Text>{SERVINGS_HEADING}</Text>
      <View style={styles.fieldsRow}>
        <View style={styles.fieldColumn}>
          <Text>{SERVINGS_QUANTITY_TEXT}</Text>
          <TextInput
            accessibilityLabel={SERVINGS_LABEL}
            value={servings}
            onChangeText={setServings}
            keyboardType='decimal-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>

        <View style={styles.fieldColumn}>
          <Text>{SERVINGS_UNIT_TEXT}</Text>
          <TextInput
            accessibilityLabel={SERVINGS_UNIT_LABEL}
            autoCorrect={false}
            autoCapitalize='none'
            placeholder='e.g. servings'
            value={servingsUnit}
            onChangeText={setServingsUnit}
            style={[styles.formInput, styles.compactInput]}
          />
        </View>
      </View>

      {ingredients.map((row, idx) => (
        <RecipeFormTextRow
          key={row.id}
          label={`Ingredient ${idx + 1}`}
          placeholder={INGREDIENT_PLACEHOLDER}
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
          placeholder={STEP_PLACEHOLDER}
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
          placeholder={TIP_PLACEHOLDER}
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

      <View style={styles.favoriteRow}>
        <Text>{FAVORITE_LABEL}</Text>
        <Switch accessibilityLabel={FAVORITE_LABEL} value={isFavorite} onValueChange={setIsFavorite} />
      </View>

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
  fieldsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  fieldColumn: {
    flex: 1,
    minWidth: 0,
  },
  compactInput: {
    minHeight: 48,
    paddingHorizontal: 8,
  },
  descriptionInput: {
    minHeight: 96,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: 8,
  },
});

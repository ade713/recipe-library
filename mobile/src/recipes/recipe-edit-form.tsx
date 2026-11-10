import { useRef, useState } from "react";
import { Button, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type { RecipeStep } from "@/types/recipe";

import { RecipeFormTextRow } from "./recipe-form-text-row";

const ADD_STEP_LABEL = "Add step";
const BASE_SERVINGS_LABEL = "Servings or yield quantity";
const COOK_TEXT = "Cook";
const COOK_TIME_LABEL = "Cook time (minutes)";
const DESCRIPTION_LABEL = "Description (optional)";
const FAVORITE_LABEL = "Favorite";
const IMAGE_URL_LABEL = "Image URL (optional)";
const INVALID_IMAGE_URL_MESSAGE = "Enter a valid HTTP or HTTPS image URL.";
const INVALID_PROTOCOL_MESSAGE = "Expected an HTTP or HTTPS URL.";
const INVALID_SERVINGS_MESSAGE = "Enter a servings or yield quantity of zero or greater.";
const MAX_TITLE_LENGTH = 255;
const PREP_TEXT = "Prep";
const PREP_TIME_LABEL = "Prep time (minutes)";
const REMOVE_STEP_LABEL = "Remove step";
const SAVE_LABEL = "Save changes";
const SAVE_UPDATE_ERROR_MESSAGE = "Unable to save changes. Please try again.";
const SERVINGS_HEADING = "Servings / yield";
const SERVINGS_QUANTITY_TEXT = "Quantity";
const SERVINGS_UNIT_LABEL = "Yield unit (optional)";
const SERVINGS_UNIT_TEXT = "Unit (optional)";
const STEP_PLACEHOLDER = "Enter Step Here";
const TIME_HEADING = "Times (minutes)";
const TIME_INPUT_ERROR_MESSAGE = "Enter times as whole minutes, zero or greater.";
const TITLE_BLANK_ERROR_MESSAGE = "Enter a recipe title.";
const TITLE_LABEL = "Recipe title";
const TITLE_LENGTH_ERROR_MESSAGE = "Recipe titles must be 255 characters or fewer.";
const TOTAL_TEXT = "Total";
const TOTAL_TIME_LABEL = "Total time (minutes)";

export type RecipeEditFormValues = {
  title: string;
  description: string | null;
  image_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  base_servings: number | null;
  servings_unit: string | null;
  steps: RecipeStep[];
  is_favorite: boolean;
};

type RecipeEditFormProps = {
  initialTitle: string;
  initialDescription?: string | null;
  initialImageUrl?: string | null;
  initialPrepTimeMinutes?: number | null;
  initialCookTimeMinutes?: number | null;
  initialTotalTimeMinutes?: number | null;
  initialBaseServings?: string | null;
  initialServingsUnit?: string | null;
  initialSteps?: RecipeStep[];
  initialIsFavorite?: boolean;
  saveDisabled?: boolean;
  onSubmit: (values: RecipeEditFormValues) => Promise<void>;
};

type FormStepRow = {
  id: number;
  text: string;
  section_title: string | null;
};

const parseTime = (value: string): number | null => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throw new Error(TIME_INPUT_ERROR_MESSAGE);
  }

  return parsedValue;
};

const parseServings = (value: string): number | null => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  const servings = Number(trimmedValue);
  if (servings < 0 || !Number.isFinite(servings)) {
    throw new Error(INVALID_SERVINGS_MESSAGE);
  }

  return servings;
};

const parseHttpUrl = (value: string): string | null => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  const url = new URL(trimmedValue);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(INVALID_PROTOCOL_MESSAGE);
  }

  return trimmedValue;
};

export function RecipeEditForm({
  initialTitle,
  initialDescription,
  initialImageUrl,
  initialPrepTimeMinutes,
  initialCookTimeMinutes,
  initialTotalTimeMinutes,
  initialBaseServings,
  initialServingsUnit,
  initialIsFavorite,
  initialSteps = [],
  saveDisabled = false,
  onSubmit,
}: RecipeEditFormProps) {
  const stepRowId = useRef(initialSteps.length - 1);

  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const [currentDescription, setCurrentDescription] = useState(initialDescription ?? "");
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl ?? "");
  const [currentPrepTime, setCurrentPrepTime] = useState(initialPrepTimeMinutes?.toString() ?? "");
  const [currentCookTime, setCurrentCookTime] = useState(initialCookTimeMinutes?.toString() ?? "");
  const [currentTotalTime, setCurrentTotalTime] = useState(initialTotalTimeMinutes?.toString() ?? "");
  const [currentBaseServings, setCurrentBaseServings] = useState(initialBaseServings ?? "");
  const [currentServingsUnit, setCurrentServingsUnit] = useState(initialServingsUnit ?? "");
  const [currentIsFavorite, setCurrentIsFavorite] = useState(initialIsFavorite ?? false);
  const [currentSteps, setCurrentSteps] = useState<FormStepRow[]>(() =>
    initialSteps.map((step, index) => ({
      id: index,
      text: step.instruction,
      section_title: step.section_title,
    })),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddStep = () => {
    stepRowId.current++;
    const newStep = { id: stepRowId.current, text: "", section_title: null };
    setCurrentSteps((prevSteps) => [...prevSteps, newStep]);
  };

  const handleRemoveStep = (stepRowId: number): void => {
    setCurrentSteps((prevSteps) => prevSteps.filter((step) => step.id !== stepRowId));
  };

  const handleChangeStep = (editedStepId: number, newStepText: string): void => {
    setCurrentSteps((prevSteps) =>
      prevSteps.map((step) => (step.id === editedStepId ? { ...step, text: newStepText } : step)),
    );
  };

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting || saveDisabled) {
      return;
    }

    const trimmedTitle = currentTitle.trim();

    if (trimmedTitle.length === 0) {
      setErrorMessage(TITLE_BLANK_ERROR_MESSAGE);
      return;
    }
    if (Array.from(trimmedTitle).length > MAX_TITLE_LENGTH) {
      setErrorMessage(TITLE_LENGTH_ERROR_MESSAGE);
      return;
    }

    const trimmedDescription = currentDescription.trim();
    const normalizedDescription = trimmedDescription.length > 0 ? trimmedDescription : null;

    let times: Pick<RecipeEditFormValues, "prep_time_minutes" | "cook_time_minutes" | "total_time_minutes">;

    try {
      times = {
        prep_time_minutes: parseTime(currentPrepTime),
        cook_time_minutes: parseTime(currentCookTime),
        total_time_minutes: parseTime(currentTotalTime),
      };
    } catch {
      setErrorMessage(TIME_INPUT_ERROR_MESSAGE);
      return;
    }

    let baseServings: number | null;
    try {
      baseServings = parseServings(currentBaseServings);
    } catch {
      setErrorMessage(INVALID_SERVINGS_MESSAGE);
      return;
    }

    const trimmedUnit = currentServingsUnit.trim();
    const normalizedServingsUnit = trimmedUnit.length > 0 ? trimmedUnit : null;

    let imageUrl: string | null;
    try {
      imageUrl = parseHttpUrl(currentImageUrl);
    } catch {
      setErrorMessage(INVALID_IMAGE_URL_MESSAGE);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const formattedSteps = currentSteps
      .filter((step) => step.text.trim().length > 0)
      .map((step, idx) => ({
        position: idx + 1,
        instruction: step.text.trim(),
        section_title: step.section_title ?? null,
      }));

    try {
      await onSubmit({
        title: trimmedTitle,
        description: normalizedDescription,
        image_url: imageUrl,
        base_servings: baseServings,
        servings_unit: normalizedServingsUnit,
        is_favorite: currentIsFavorite,
        steps: formattedSteps,
        ...times,
      });
    } catch {
      setErrorMessage(SAVE_UPDATE_ERROR_MESSAGE);
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

      <Text>{IMAGE_URL_LABEL}</Text>
      <TextInput
        accessibilityLabel={IMAGE_URL_LABEL}
        editable={!isSubmitting}
        value={currentImageUrl}
        autoCapitalize='none'
        autoCorrect={false}
        keyboardType='url'
        onChangeText={setCurrentImageUrl}
        style={styles.formInput}
      />

      <Text>{TIME_HEADING}</Text>
      <View style={styles.fieldsRow}>
        <View style={styles.fieldColumn}>
          <Text>{PREP_TEXT}</Text>
          <TextInput
            accessibilityLabel={PREP_TIME_LABEL}
            editable={!isSubmitting}
            value={currentPrepTime}
            onChangeText={setCurrentPrepTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>

        <View style={styles.fieldColumn}>
          <Text>{COOK_TEXT}</Text>
          <TextInput
            accessibilityLabel={COOK_TIME_LABEL}
            editable={!isSubmitting}
            value={currentCookTime}
            onChangeText={setCurrentCookTime}
            keyboardType='number-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>

        <View style={styles.fieldColumn}>
          <Text>{TOTAL_TEXT}</Text>
          <TextInput
            accessibilityLabel={TOTAL_TIME_LABEL}
            editable={!isSubmitting}
            value={currentTotalTime}
            onChangeText={setCurrentTotalTime}
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
            accessibilityLabel={BASE_SERVINGS_LABEL}
            editable={!isSubmitting}
            value={currentBaseServings}
            onChangeText={setCurrentBaseServings}
            keyboardType='decimal-pad'
            style={[styles.formInput, styles.compactInput]}
          />
        </View>

        <View style={styles.fieldColumn}>
          <Text>{SERVINGS_UNIT_TEXT}</Text>
          <TextInput
            accessibilityLabel={SERVINGS_UNIT_LABEL}
            editable={!isSubmitting}
            autoCorrect={false}
            autoCapitalize='none'
            value={currentServingsUnit}
            onChangeText={setCurrentServingsUnit}
            style={[styles.formInput, styles.compactInput]}
          />
        </View>
      </View>

      <View style={[styles.fieldsRow, styles.favoriteRow]}>
        <Text>{FAVORITE_LABEL}</Text>
        <Switch
          accessibilityLabel={FAVORITE_LABEL}
          disabled={isSubmitting}
          value={currentIsFavorite}
          onValueChange={setCurrentIsFavorite}
        />
      </View>

      {currentSteps.map((row, idx) => (
        <RecipeFormTextRow
          key={row.id}
          label={`Step ${idx + 1}`}
          placeholder={STEP_PLACEHOLDER}
          value={row.text}
          multiline={true}
          removeLabel={`${REMOVE_STEP_LABEL} ${idx + 1}`}
          removeTitle={REMOVE_STEP_LABEL}
          onChangeText={(text) => handleChangeStep(row.id, text)}
          onRemove={() => handleRemoveStep(row.id)}
        />
      ))}
      <Button title={ADD_STEP_LABEL} onPress={handleAddStep} />

      <Button
        accessibilityLabel={SAVE_LABEL}
        title={SAVE_LABEL}
        disabled={isSubmitting || saveDisabled}
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
  favoriteRow: {
    alignItems: "center",
  },
  errorMessage: {
    color: "#f32121",
  },
});

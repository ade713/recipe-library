import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const COOK_TEXT = "Cook";
const COOK_TIME_LABEL = "Cook time (minutes)";
const DESCRIPTION_LABEL = "Description (optional)";
const MAX_TITLE_LENGTH = 255;
const PREP_TEXT = "Prep";
const PREP_TIME_LABEL = "Prep time (minutes)";
const SAVE_LABEL = "Save changes";
const SAVE_UPDATE_ERROR_MESSAGE = "Unable to save changes. Please try again.";
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
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
};

type RecipeEditFormProps = {
  initialTitle: string;
  initialPrepTimeMinutes?: number | null;
  initialCookTimeMinutes?: number | null;
  initialTotalTimeMinutes?: number | null;
  initialDescription?: string | null;
  onSubmit: (values: RecipeEditFormValues) => Promise<void>;
};

const parseTimeInput = (value: string): number | null => {
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

export function RecipeEditForm({
  initialTitle,
  initialDescription,
  initialPrepTimeMinutes,
  initialCookTimeMinutes,
  initialTotalTimeMinutes,
  onSubmit,
}: RecipeEditFormProps) {
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const [currentDescription, setCurrentDescription] = useState(initialDescription ?? "");
  const [currentPrepTime, setCurrentPrepTime] = useState(initialPrepTimeMinutes?.toString() ?? "");
  const [currentCookTime, setCurrentCookTime] = useState(initialCookTimeMinutes?.toString() ?? "");
  const [currentTotalTime, setCurrentTotalTime] = useState(initialTotalTimeMinutes?.toString() ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) {
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
        prep_time_minutes: parseTimeInput(currentPrepTime),
        cook_time_minutes: parseTimeInput(currentCookTime),
        total_time_minutes: parseTimeInput(currentTotalTime),
      };
    } catch {
      setErrorMessage(TIME_INPUT_ERROR_MESSAGE);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        title: trimmedTitle,
        description: normalizedDescription,
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
  errorMessage: {
    color: "#f32121",
  },
});

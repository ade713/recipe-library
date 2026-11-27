import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const ADD_NOTE_LABEL = "Add note";
const ENTER_NOTE_MESSAGE = "Enter a note.";
const NOTE_INPUT_LABEL = "Personal note";
const SAVE_ERROR_MESSAGE = "Unable to add note. Please try again.";

type RecipeNoteFormProps = {
  onSubmit: (note: string) => Promise<void>;
};

export function RecipeNoteForm({ onSubmit }: RecipeNoteFormProps) {
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const errorMessage = validationMessage ?? saveErrorMessage;

  const handleChangeNoteText = (text: string): void => {
    setValidationMessage(null);
    setSaveErrorMessage(null);
    setNoteText(text);
  };

  const handleSubmit = async () => {
    if (isSaving) {
      return;
    }

    const trimmedNote = noteText.trim();

    if (trimmedNote.length === 0) {
      setValidationMessage(ENTER_NOTE_MESSAGE);
      return;
    }

    setSaveErrorMessage(null);
    setIsSaving(true);

    try {
      await onSubmit(trimmedNote);
      setNoteText("");
    } catch {
      setSaveErrorMessage(SAVE_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      {errorMessage !== null && <Text style={styles.errorMessage}>{errorMessage}</Text>}
      <TextInput
        accessibilityLabel={NOTE_INPUT_LABEL}
        value={noteText}
        autoCorrect={false}
        multiline={true}
        editable={!isSaving}
        textAlignVertical='top'
        onChangeText={handleChangeNoteText}
        style={styles.formInput}
      />
      <Button
        accessibilityLabel={ADD_NOTE_LABEL}
        title={ADD_NOTE_LABEL}
        disabled={isSaving}
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

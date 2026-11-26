import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const ADD_NOTE_LABEL = "Add note";
const ENTER_NOTE_MESSAGE = "Enter a note.";
const NOTE_INPUT_LABEL = "Personal note";

type RecipeNoteFormProps = {
  onSubmit: (note: string) => Promise<void>;
};

export function RecipeNoteForm({ onSubmit }: RecipeNoteFormProps) {
  const [noteText, setNoteText] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleChangeNoteText = (text: string): void => {
    setValidationMessage(null);
    setNoteText(text);
  };

  const handleSubmit = async () => {
    const trimmedNote = noteText.trim();

    if (trimmedNote.length === 0) {
      setValidationMessage(ENTER_NOTE_MESSAGE);
      return;
    }

    await onSubmit(trimmedNote);
  };

  return (
    <View>
      {validationMessage !== null && <Text style={styles.errorMessage}>{validationMessage}</Text>}
      <TextInput
        accessibilityLabel={NOTE_INPUT_LABEL}
        value={noteText}
        autoCorrect={false}
        multiline={true}
        textAlignVertical='top'
        onChangeText={handleChangeNoteText}
        style={styles.formInput}
      />
      <Button
        accessibilityLabel={ADD_NOTE_LABEL}
        title={ADD_NOTE_LABEL}
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

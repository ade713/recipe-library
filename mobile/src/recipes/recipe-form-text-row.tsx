import { Button, StyleSheet, TextInput, View } from "react-native";

type RecipeFormTextRowProps = {
  label: string;
  placeholder: string;
  value: string;
  multiline?: boolean;
  autoFocus?: boolean;
  removeLabel: string;
  removeTitle: string;
  onChangeText: (text: string) => void;
  onRemove: () => void;
};

export function RecipeFormTextRow({
  label,
  placeholder,
  value,
  multiline,
  autoFocus,
  removeLabel,
  removeTitle,
  onChangeText,
  onRemove,
}: RecipeFormTextRowProps) {
  return (
    <View style={styles.formTextRow}>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        multiline={multiline}
        value={value}
        autoFocus={autoFocus}
        autoCorrect={false}
        onChangeText={onChangeText}
        textAlignVertical={multiline ? "top" : "center"}
        style={styles.formInput}
      />
      <Button title={removeTitle} accessibilityLabel={removeLabel} onPress={onRemove} />
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
    flex: 1,
    minWidth: 0,
    borderRadius: 2,
    borderColor: "#2196F3",
    borderWidth: 1,
    borderStyle: "solid",
    marginTop: 2,
    marginBottom: 2,
  },
});

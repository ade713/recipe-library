import { Pressable, StyleSheet, Text } from "react-native";

type RecipeOptionButtonProps = {
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function RecipeOptionButton({ label, selected, onPress, accessibilityLabel }: RecipeOptionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole='button'
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.button, selected && styles.buttonSelected]}
    >
      <Text style={styles.buttonTitle}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#2196F3",
    borderRadius: 2,
    padding: 4,
    elevation: 4,
  },
  buttonSelected: {
    backgroundColor: "#135080",
    elevation: 2,
  },
  buttonTitle: {
    color: "#fff",
    fontWeight: 500,
    margin: 8,
    textAlign: "center",
    textTransform: "uppercase",
    overflow: "hidden",
  },
});

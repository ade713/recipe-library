import { StyleSheet, Text, View } from "react-native";

export default function RecipeLibraryScreen() {
  return (
    <View style={styles.container}>
      <Text>Your recipe library.</Text>
      <Text>Your saved recipes will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
});

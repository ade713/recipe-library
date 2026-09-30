import { Image, StyleSheet, Text, View } from "react-native";

import type { RecipeSummary } from "@/types/recipe";

type RecipeSummaryCardProps = {
  recipe: RecipeSummary;
};

export function RecipeSummaryCard({ recipe }: RecipeSummaryCardProps) {
  return (
    <View style={styles.container}>
      <Text>{recipe.title}</Text>
      {recipe.image_url !== null && (
        <Image
          source={{ uri: recipe.image_url }}
          accessible={true}
          accessibilityLabel={`${recipe.title} photo`}
          style={styles.recipeImage}
        />
      )}
      {recipe.total_time_minutes !== null && <Text>{`${recipe.total_time_minutes} min`}</Text>}
      {recipe.base_servings !== null && <Text>{`Servings: ${recipe.base_servings}`}</Text>}
      {recipe.tags.map((tag) => (
        <Text key={tag}>{tag}</Text>
      ))}
      {recipe.is_favorite && <Text>Favorite</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recipeImage: {
    height: 50,
    width: 50,
  },
});

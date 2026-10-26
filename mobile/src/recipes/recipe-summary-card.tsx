import { useState } from "react";
import { Image, Pressable, StyleSheet, Text } from "react-native";

import type { RecipeSummary } from "@/types/recipe";

type RecipeSummaryCardProps = {
  recipe: RecipeSummary;
  onPress?: () => void;
};

export function RecipeSummaryCard({ recipe, onPress }: RecipeSummaryCardProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const imageUrl = recipe.image_url;
  const shouldDisplayImage = imageUrl !== null && imageUrl.trim().length > 0 && imageUrl !== failedImageUrl;
  const isDisabledButton = onPress === undefined;

  return (
    <Pressable
      accessibilityRole={!isDisabledButton ? "button" : undefined}
      accessibilityLabel={!isDisabledButton ? `Open ${recipe.title}` : undefined}
      disabled={isDisabledButton}
      onPress={onPress}
      style={styles.container}
    >
      <Text>{recipe.title}</Text>
      {shouldDisplayImage && (
        <Image
          source={{ uri: imageUrl }}
          accessible={true}
          accessibilityLabel={`${recipe.title} photo`}
          onError={() => setFailedImageUrl(imageUrl)}
          style={styles.recipeImage}
        />
      )}
      {recipe.total_time_minutes !== null && <Text>{`${recipe.total_time_minutes} min`}</Text>}
      {recipe.base_servings !== null && <Text>{`Servings: ${recipe.base_servings}`}</Text>}
      {recipe.tags.map((tag) => (
        <Text key={tag}>{tag}</Text>
      ))}
      {recipe.is_favorite && <Text>Favorite</Text>}
    </Pressable>
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

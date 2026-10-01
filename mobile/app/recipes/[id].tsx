import { useLocalSearchParams } from "expo-router";

import { RecipeDetailScreen } from "@/recipes/recipe-detail-screen";

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <RecipeDetailScreen recipeId={id} />;
}

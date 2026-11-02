import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";

import { RecipeDetailScreen } from "@/recipes/recipe-detail-screen";

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isFocused = useIsFocused();
  const router = useRouter();

  return (
    <RecipeDetailScreen
      recipeId={id}
      isFocused={isFocused}
      onEdit={() => {
        router.push(`/recipes/${id}/edit`);
      }}
    />
  );
}

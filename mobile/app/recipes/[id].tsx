import { useHeaderHeight } from "expo-router/react-navigation";
import { useIsFocused, useLocalSearchParams, useRouter } from "expo-router";

import { RecipeDetailScreen } from "@/recipes/recipe-detail-screen";

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerHeight = useHeaderHeight();
  const isFocused = useIsFocused();
  const router = useRouter();

  return (
    <RecipeDetailScreen
      recipeId={id}
      headerHeight={headerHeight}
      isFocused={isFocused}
      onEdit={() => {
        router.push(`/recipes/${id}/edit`);
      }}
    />
  );
}

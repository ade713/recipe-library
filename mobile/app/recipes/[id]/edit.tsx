import { useLocalSearchParams, useRouter } from "expo-router";

import { RecipeEditScreen } from "@/recipes/recipe-edit-screen";
import { useHeaderHeight } from "expo-router/react-navigation";

export default function EditRecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();

  return (
    <RecipeEditScreen
      recipeId={id}
      headerHeight={headerHeight}
      onSaved={(savedRecipe) => {
        router.dismissTo(`/recipes/${savedRecipe.id}`);
      }}
    />
  );
}

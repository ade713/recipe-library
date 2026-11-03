import { useLocalSearchParams, useRouter } from "expo-router";

import { RecipeEditScreen } from "@/recipes/recipe-edit-screen";

export default function EditRecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <RecipeEditScreen
      recipeId={id}
      onSaved={(savedRecipe) => {
        router.dismissTo(`/recipes/${savedRecipe.id}`);
      }}
    />
  );
}

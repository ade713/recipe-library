import { useLocalSearchParams, useRouter } from "expo-router";

import { RecipeTitleEditScreen } from "@/recipes/recipe-title-edit-screen";

export default function EditRecipeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <RecipeTitleEditScreen
      recipeId={id}
      onSaved={(savedRecipe) => {
        router.dismissTo(`/recipes/${savedRecipe.id}`);
      }}
    />
  );
}

import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { ImportRecipeScreen } from "@/imports/import-recipe-screen";

export default function ImportRecipeRoute() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();

  return (
    <ImportRecipeScreen
      headerHeight={headerHeight}
      onEnterManually={() => router.push("/recipes/new")}
      onOpenExisting={(recipeId) => router.push(`/recipes/${recipeId}`)}
      onSaved={(recipeId) => router.replace(`/recipes/${recipeId}`)}
    />
  );
}

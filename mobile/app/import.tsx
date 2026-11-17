import { useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";

import { ImportRecipeScreen } from "@/imports/import-recipe-screen";

export default function ImportRecipeRoute() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();

  return (
    <ImportRecipeScreen
      headerHeight={headerHeight}
      onOpenExisting={(recipeId) => router.push(`/recipes/${recipeId}`)}
      onEnterManually={() => router.push("/recipes/new")}
    />
  );
}

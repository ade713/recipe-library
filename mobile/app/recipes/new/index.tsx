import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import type { RecipeCreateRequest } from "@/types/recipe";

export default function NewRecipeScreen() {
  const router = useRouter();

  const handleSaveRecipe = async (values: RecipeCreateRequest) => {
    const recipe = await saveRecipe(values);
    router.replace(`/recipes/${recipe.id}`);
  };

  return (
    <SafeAreaView edges={["bottom"]}>
      <RecipeCreateForm onSubmit={handleSaveRecipe} />
    </SafeAreaView>
  );
}

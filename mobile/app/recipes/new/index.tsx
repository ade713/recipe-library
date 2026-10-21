import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRouter } from "expo-router";
import { RecipeCreateForm } from "@/recipes/recipe-create-form";
import { saveRecipe } from "@/recipes/recipe-service";
import type { RecipeCreateRequest } from "@/types/recipe";

export default function NewRecipeScreen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();

  const handleSaveRecipe = async (values: RecipeCreateRequest) => {
    const recipe = await saveRecipe(values);
    router.replace(`/recipes/${recipe.id}`);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={headerHeight} style={styles.container}>
        <ScrollView keyboardShouldPersistTaps='handled'>
          <RecipeCreateForm onSubmit={handleSaveRecipe} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

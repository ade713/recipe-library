import { useCallback, useState } from "react";
import { Button, FlatList, StyleSheet, Text, TextInput } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { apiFetch } from "@/api/client";
import { loadRecipes } from "@/recipes/recipe-service";
import type { RecipeSummary } from "@/types/recipe";
import { RecipeSummaryCard } from "@/recipes/recipe-summary-card";
import { useAuth } from "@/auth/auth-provider";
import { SafeAreaView } from "react-native-safe-area-context";

type HealthResponse = {
  status: string;
};

const LOAD_RECIPES_ERROR_MESSAGE = "Unable to load recipes.";
const LOADING_RECIPES_MESSAGE = "Loading recipes...";
const NO_RECIPES_MESSAGE = "No saved recipes yet.";
const NO_RECIPES_SEARCH_MESSAGE = "No recipes match your search.";
const RETRY_TEXT = "Retry";
const SEARCH_RECIPES_TEXT = "Search recipes";
const SIGN_OUT_ERROR_MESSAGE = "Unable to sign out. Please try again.";

export default function RecipeLibraryScreen() {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [loadingRecipesError, setLoadingRecipesError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState("Not checked");
  const [searchText, setSearchText] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const checkAPI = async (): Promise<void> => {
    setApiStatus("Checking...");

    try {
      const res = await apiFetch<HealthResponse>("/health");

      if (res === undefined) {
        throw new Error("Expected a health response");
      }

      setApiStatus(res.status);
    } catch {
      setApiStatus("An error occurred while checking health.");
    }
  };

  const handleSignOut = async (): Promise<void> => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
    } catch {
      setSignOutError(SIGN_OUT_ERROR_MESSAGE);
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSubmitSearch = (): void => {
    setSubmittedQuery(searchText.trim());
  };

  const retryLoadingRecipes = (): void => {
    if (isLoadingRecipes) {
      return;
    }

    setIsLoadingRecipes(true);
    setLoadingRecipesError(null);

    setLoadingAttempt((attempt) => attempt + 1);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setIsLoadingRecipes(true);
      setLoadingRecipesError(null);

      const getRecipes = async (): Promise<void> => {
        try {
          const result = await loadRecipes({ query: submittedQuery });

          if (active) {
            setRecipes(result.items);
          }
        } catch {
          if (active) {
            setLoadingRecipesError(LOAD_RECIPES_ERROR_MESSAGE);
          }
        } finally {
          if (active) {
            setIsLoadingRecipes(false);
          }
        }
      };

      void getRecipes();

      return () => {
        active = false;
      };
    }, [loadingAttempt, submittedQuery]),
  );

  const shouldDisplayNoRecipesMessage = !isLoadingRecipes && loadingRecipesError === null && recipes.length === 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Text>Your recipe library.</Text>

      <TextInput accessibilityLabel={SEARCH_RECIPES_TEXT} value={searchText} onChangeText={setSearchText} />
      <Button title='Search' onPress={handleSubmitSearch} />

      {shouldDisplayNoRecipesMessage &&
        (submittedQuery.length > 0 ? <Text>{NO_RECIPES_SEARCH_MESSAGE}</Text> : <Text>{NO_RECIPES_MESSAGE}</Text>)}

      {loadingRecipesError && (
        <>
          <Text>{loadingRecipesError}</Text>
          <Button title={RETRY_TEXT} onPress={retryLoadingRecipes} />
        </>
      )}
      {isLoadingRecipes ? (
        <Text>{LOADING_RECIPES_MESSAGE}</Text>
      ) : (
        <FlatList
          data={recipes}
          renderItem={({ item }) => (
            <RecipeSummaryCard
              recipe={item}
              onPress={() =>
                router.push({
                  pathname: "/recipes/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          keyExtractor={(item) => item.id}
        />
      )}

      <Button title='Check API' onPress={checkAPI} />
      <Text>{apiStatus}</Text>

      {signOutError && <Text>{signOutError}</Text>}
      <Button title='Sign out' disabled={isSigningOut} onPress={handleSignOut} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
});

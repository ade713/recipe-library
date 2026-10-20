import { useCallback, useState } from "react";
import { Button, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { apiFetch } from "@/api/client";
import { loadRecipes } from "@/recipes/recipe-service";
import { RecipeOptionButton } from "@/recipes/recipe-option-button";
import { RecipeSummaryCard } from "@/recipes/recipe-summary-card";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-provider";
import type { ListRecipesOptions } from "@/api/recipes";
import type { RecipeSummary } from "@/types/recipe";

type HealthResponse = {
  status: string;
};

const ALL_BUTTON_TEXT = "All";
const CREATE_RECIPE_BUTTON_TITLE = "Create recipe";
const FAVORITES_BUTTON_TEXT = "Favorites";
const FILTER_ANY_TIME_TITLE = "Any time";
const FILTER_MAX_TOTAL_TIME_TITLE = "30 min or less";
const FILTER_MAX_TOTAL_TIME_VALUE = 30;
const LOAD_RECIPES_ERROR_MESSAGE = "Unable to load recipes.";
const LOADING_RECIPES_MESSAGE = "Loading recipes...";
const NO_FAVORITE_RECIPES_MESSAGE = "No favorite saved recipes yet.";
const NO_RECIPES_FILTER_MESSAGE = "No recipes match your filters.";
const NO_RECIPES_SAVED_MESSAGE = "No saved recipes yet.";
const NO_RECIPES_SEARCH_MESSAGE = "No recipes match your search.";
const RETRY_BUTTON_TITLE = "Retry";
const SEARCH_BUTTON_TITLE = "Search";
const SEARCH_RECIPES_TEXT = "Search recipes";
const SIGN_OUT_BUTTON_TITLE = "Sign out";
const SIGN_OUT_ERROR_MESSAGE = "Unable to sign out. Please try again.";
const SORT_RECENT = "recent";
const SORT_RECENT_BUTTON_TITLE = "Newest";
const SORT_TIME = "time";
const SORT_TIME_BUTTON_TITLE = "Shortest time";
const SORT_TITLE = "title";
const SORT_TITLE_AZ_BUTTON_TITLE = "Title A–Z";

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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<"recent" | "title" | "time">(SORT_RECENT);
  const [maxTotalTime, setMaxTotalTime] = useState<number | undefined>(undefined);

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
          const options: ListRecipesOptions = { query: submittedQuery, sort };
          if (favoritesOnly) {
            options.favorite = true;
          }
          if (maxTotalTime !== undefined) {
            options.maxTotalTime = maxTotalTime;
          }

          const result = await loadRecipes(options);

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
    }, [loadingAttempt, submittedQuery, favoritesOnly, sort, maxTotalTime]),
  );

  const shouldDisplayNoRecipesMessage = !isLoadingRecipes && loadingRecipesError === null && recipes.length === 0;

  const getNoRecipesMessage = (): string => {
    if (submittedQuery.length > 0) {
      return NO_RECIPES_SEARCH_MESSAGE;
    } else if (maxTotalTime !== undefined) {
      return NO_RECIPES_FILTER_MESSAGE;
    } else if (favoritesOnly) {
      return NO_FAVORITE_RECIPES_MESSAGE;
    } else {
      return NO_RECIPES_SAVED_MESSAGE;
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Text>Your recipe library.</Text>

      <Button title={CREATE_RECIPE_BUTTON_TITLE} onPress={() => router.push("/recipes/new")} />

      <View style={styles.buttonsContainer}>
        <RecipeOptionButton label={ALL_BUTTON_TEXT} selected={!favoritesOnly} onPress={() => setFavoritesOnly(false)} />
        <RecipeOptionButton
          label={FAVORITES_BUTTON_TEXT}
          selected={favoritesOnly}
          onPress={() => setFavoritesOnly(true)}
        />
      </View>
      <Text>{`Showing: ${favoritesOnly ? FAVORITES_BUTTON_TEXT : ALL_BUTTON_TEXT}`}</Text>

      <View style={styles.searchBar}>
        <TextInput
          accessibilityLabel={SEARCH_RECIPES_TEXT}
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
        <Button title={SEARCH_BUTTON_TITLE} onPress={handleSubmitSearch} />
      </View>

      <View style={styles.buttonsContainer}>
        <RecipeOptionButton
          accessibilityLabel={`Sort by: ${SORT_RECENT_BUTTON_TITLE}`}
          label={SORT_RECENT_BUTTON_TITLE}
          selected={sort === SORT_RECENT}
          onPress={() => setSort(SORT_RECENT)}
        />
        <RecipeOptionButton
          accessibilityLabel={`Sort by: ${SORT_TITLE_AZ_BUTTON_TITLE}`}
          label={SORT_TITLE_AZ_BUTTON_TITLE}
          selected={sort === SORT_TITLE}
          onPress={() => setSort(SORT_TITLE)}
        />
        <RecipeOptionButton
          accessibilityLabel={`Sort by: ${SORT_TIME_BUTTON_TITLE}`}
          label={SORT_TIME_BUTTON_TITLE}
          selected={sort === SORT_TIME}
          onPress={() => setSort(SORT_TIME)}
        />
      </View>

      <View style={styles.buttonsContainer}>
        <RecipeOptionButton
          label={FILTER_ANY_TIME_TITLE}
          selected={maxTotalTime === undefined}
          onPress={() => setMaxTotalTime(undefined)}
        />
        <RecipeOptionButton
          label={FILTER_MAX_TOTAL_TIME_TITLE}
          selected={maxTotalTime === FILTER_MAX_TOTAL_TIME_VALUE}
          onPress={() => setMaxTotalTime(FILTER_MAX_TOTAL_TIME_VALUE)}
        />
      </View>

      {shouldDisplayNoRecipesMessage && <Text>{getNoRecipesMessage()}</Text>}

      {loadingRecipesError && (
        <>
          <Text>{loadingRecipesError}</Text>
          <Button title={RETRY_BUTTON_TITLE} onPress={retryLoadingRecipes} />
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
      <Button title={SIGN_OUT_BUTTON_TITLE} disabled={isSigningOut} onPress={handleSignOut} />
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
  buttonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    borderRadius: 2,
    borderColor: "#2196F3",
    borderWidth: 1,
    borderStyle: "solid",
  },
});

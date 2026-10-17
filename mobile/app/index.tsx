import { useCallback, useState } from "react";
import { Button, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { apiFetch } from "@/api/client";
import { loadRecipes } from "@/recipes/recipe-service";
import type { RecipeSummary } from "@/types/recipe";
import { RecipeSummaryCard } from "@/recipes/recipe-summary-card";
import { useAuth } from "@/auth/auth-provider";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ListRecipesOptions } from "@/api/recipes";

type HealthResponse = {
  status: string;
};

const ALL_BUTTON_TEXT = "All";
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

      <View style={styles.buttonsContainer}>
        <Button
          title={ALL_BUTTON_TEXT}
          accessibilityState={{ selected: !favoritesOnly }}
          onPress={() => setFavoritesOnly(false)}
        />
        <Button
          title={FAVORITES_BUTTON_TEXT}
          accessibilityState={{ selected: favoritesOnly }}
          onPress={() => setFavoritesOnly(true)}
        />
      </View>
      <Text>{`Showing: ${favoritesOnly ? FAVORITES_BUTTON_TEXT : ALL_BUTTON_TEXT}`}</Text>

      <TextInput accessibilityLabel={SEARCH_RECIPES_TEXT} value={searchText} onChangeText={setSearchText} />
      <Button title={SEARCH_BUTTON_TITLE} onPress={handleSubmitSearch} />

      <View style={styles.buttonsContainer}>
        <Button
          title={SORT_RECENT_BUTTON_TITLE}
          accessibilityLabel={`Sort by: ${SORT_RECENT_BUTTON_TITLE}`}
          accessibilityState={{ selected: sort === SORT_RECENT }}
          onPress={() => setSort(SORT_RECENT)}
        />
        <Button
          title={SORT_TITLE_AZ_BUTTON_TITLE}
          accessibilityLabel={`Sort by: ${SORT_TITLE_AZ_BUTTON_TITLE}`}
          accessibilityState={{ selected: sort === SORT_TITLE }}
          onPress={() => setSort(SORT_TITLE)}
        />
        <Button
          title={SORT_TIME_BUTTON_TITLE}
          accessibilityLabel={`Sort by: ${SORT_TIME_BUTTON_TITLE}`}
          accessibilityState={{ selected: sort === SORT_TIME }}
          onPress={() => setSort(SORT_TIME)}
        />
      </View>

      <View style={styles.buttonsContainer}>
        <Pressable
          accessibilityRole='button'
          accessibilityState={{ selected: maxTotalTime === undefined }}
          onPress={() => setMaxTotalTime(undefined)}
          style={[styles.timeFilterButton, maxTotalTime === undefined && styles.timeFilterButtonSelected]}
        >
          <Text style={styles.buttonTitle}>{FILTER_ANY_TIME_TITLE}</Text>
        </Pressable>
        <Pressable
          accessibilityRole='button'
          accessibilityState={{ selected: maxTotalTime === FILTER_MAX_TOTAL_TIME_VALUE }}
          onPress={() => setMaxTotalTime(FILTER_MAX_TOTAL_TIME_VALUE)}
          style={[
            styles.timeFilterButton,
            maxTotalTime === FILTER_MAX_TOTAL_TIME_VALUE && styles.timeFilterButtonSelected,
          ]}
        >
          <Text style={styles.buttonTitle}>{FILTER_MAX_TOTAL_TIME_TITLE}</Text>
        </Pressable>
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
  timeFilterButton: {
    backgroundColor: "#2196F3",
    borderRadius: 2,
    padding: 4,
    elevation: 4,
  },
  timeFilterButtonSelected: {
    backgroundColor: "#135080",
  },
  buttonTitle: {
    color: "#fff",
    fontWeight: 500,
    margin: 8,
    textAlign: "center",
    textTransform: "uppercase",
    overflow: "hidden",
  },
  buttonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
});

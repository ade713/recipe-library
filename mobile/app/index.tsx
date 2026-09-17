import { useState } from "react";
import { apiFetch } from "@/api/client";
import { Button, StyleSheet, Text, View } from "react-native";

type HealthResponse = {
  status: string;
};

export default function RecipeLibraryScreen() {
  const [apiStatus, setApiStatus] = useState("Not checked");

  async function checkAPI(): Promise<void> {
    setApiStatus("Checking...");

    try {
      const res = await apiFetch<HealthResponse>("/health");
      setApiStatus(res.status);
    } catch {
      setApiStatus("An error occurred while checking health.");
    }
  }

  return (
    <View style={styles.container}>
      <Text>Your recipe library.</Text>
      <Text>Your saved recipes will appear here.</Text>

      <Button title='Check API' onPress={checkAPI} />
      <Text>{apiStatus}</Text>
    </View>
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

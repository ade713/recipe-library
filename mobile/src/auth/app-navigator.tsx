import { Stack } from "expo-router";
import { useAuth } from "./auth-provider";

/** Define the app's navigation screens. */
export function AppNavigator() {
  const { state } = useAuth();

  return (
    <Stack>
      <Stack.Protected guard={state.status === "authenticated"}>
        <Stack.Screen name='index' options={{ title: "Recipe Library" }} />
      </Stack.Protected>
      <Stack.Protected guard={state.status === "signedOut"}>
        <Stack.Screen name='login' options={{ title: "Sign in" }} />
      </Stack.Protected>
    </Stack>
  );
}

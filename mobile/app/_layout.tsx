import { Stack } from "expo-router";
import { AuthProvider } from "@/auth/auth-provider";
import { AuthRestorationGate } from "@/auth/auth-restoration-gate";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthRestorationGate>
        <Stack>
          <Stack.Screen name='index' options={{ title: "Recipe Library" }} />
        </Stack>
      </AuthRestorationGate>
    </AuthProvider>
  );
}

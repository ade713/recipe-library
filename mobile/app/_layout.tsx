import { Stack } from "expo-router";
import { AuthProvider } from "@/auth/auth-provider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name='index' options={{ title: "Recipe Library" }} />
      </Stack>
    </AuthProvider>
  );
}

import { AuthProvider } from "@/auth/auth-provider";
import { AuthRestorationGate } from "@/auth/auth-restoration-gate";
import { AppNavigator } from "@/auth/app-navigator";

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthRestorationGate>
        <AppNavigator />
      </AuthRestorationGate>
    </AuthProvider>
  );
}

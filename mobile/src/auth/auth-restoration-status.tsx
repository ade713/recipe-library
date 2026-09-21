import { ActivityIndicator, Button, Text, View } from "react-native";
import type { AuthState } from "./auth-state";

type Props = {
  state: AuthState;
  onRetry: () => void;
};

/** Display session-restoration progress or recovery controls. */
export function AuthRestorationStatus({ state, onRetry }: Props) {
  if (state.status === "loading") {
    return (
      <View>
        <ActivityIndicator accessibilityLabel='Restoring session' />
        <Text>Restoring session...</Text>
      </View>
    );
  }

  if (state.status === "error") {
    return (
      <View>
        <Text>{state.message}</Text>
        <Button title='Retry' onPress={onRetry} />
      </View>
    );
  }

  return null;
}

import { Button, Text, TextInput, View } from "react-native";
import type { LoginRequest } from "@/types/auth";
import { useState } from "react";

type Props = {
  onSubmit: (payload: LoginRequest) => Promise<void>;
};

const BLANK_EMAIL_OR_PASSWORD_ERROR_MESSAGE = "Enter your email and password.";
const SIGN_IN_ERROR_MESSAGE = "Unable to sign in. Please try again.";

/** Collect credentials and display sign-in feedback. */
export function LoginForm({ onSubmit }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) return;

    if (email.trim() === "" || password === "") {
      setErrorMessage(BLANK_EMAIL_OR_PASSWORD_ERROR_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({ email, password });
    } catch {
      setErrorMessage(SIGN_IN_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View>
      {errorMessage !== null && <Text>{errorMessage}</Text>}
      <Text>Email</Text>
      <TextInput
        accessibilityLabel='Email'
        keyboardType='email-address'
        autoCapitalize='none'
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      <Text>Password</Text>
      <TextInput accessibilityLabel='Password' secureTextEntry value={password} onChangeText={setPassword} />
      <Button title='Sign in' disabled={isSubmitting} onPress={handleSubmit} />
    </View>
  );
}

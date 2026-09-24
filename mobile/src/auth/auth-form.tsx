import { Button, Text, TextInput, View } from "react-native";
import { useState } from "react";

export type AuthFormValues = {
  email: string;
  password: string;
};

type Props = {
  onSubmit: (payload: AuthFormValues) => Promise<void>;
  submitLabel: string;
  submitErrorMessage: string;
};

const BLANK_EMAIL_OR_PASSWORD_ERROR_MESSAGE = "Enter your email and password.";

/** Collect credentials and display submission feedback. */
export function AuthForm({ onSubmit, submitLabel, submitErrorMessage }: Props) {
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
      setErrorMessage(submitErrorMessage);
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
      <Button title={submitLabel} disabled={isSubmitting} onPress={handleSubmit} />
    </View>
  );
}

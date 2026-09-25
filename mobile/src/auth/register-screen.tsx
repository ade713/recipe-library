import { useState } from "react";
import { Text } from "react-native";
import { register } from "@/api/auth";
import { AuthForm, type AuthFormValues } from "./auth-form";
import { Link } from "expo-router";

const CREATE_ACCOUNT_LABEL = "Create account";
const CREATE_ACCOUNT_ERROR_MESSAGE = "Unable to create account. Please try again.";
const ACCOUNT_CREATED_MESSAGE = "Account created. Please sign in.";
const PASSWORD_LENGTH_MESSAGE = "Use at least 8 characters for your password.";
const MINIMUM_PASSWORD_LENGTH = 8;
const SIGN_IN_TEXT = "Sign in";

/** Check the registration password requirement. */
const validateRegistration = (values: AuthFormValues): string | null => {
  if (values.password.length < MINIMUM_PASSWORD_LENGTH) {
    return PASSWORD_LENGTH_MESSAGE;
  }

  return null;
};

/** Create an account using the shared credentials form. */
export function RegisterScreen() {
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegister = async (payload: AuthFormValues): Promise<void> => {
    await register(payload);
    setIsRegistered(true);
  };

  if (isRegistered) {
    return (
      <>
        <Text>{ACCOUNT_CREATED_MESSAGE}</Text>
        <Link href='/login' replace>
          {SIGN_IN_TEXT}
        </Link>
      </>
    );
  }

  return (
    <AuthForm
      onSubmit={handleRegister}
      submitLabel={CREATE_ACCOUNT_LABEL}
      submitErrorMessage={CREATE_ACCOUNT_ERROR_MESSAGE}
      validate={validateRegistration}
    />
  );
}

import { useAuth } from "./auth-provider";
import { AuthForm } from "./auth-form";

const SIGN_IN_ERROR_MESSAGE = "Unable to sign in. Please try again.";
const SIGN_IN_LABEL = "Sign in";

/** Connect the login form to shared authentication state. */
export function LoginScreen() {
  const { signIn } = useAuth();

  return <AuthForm onSubmit={signIn} submitLabel={SIGN_IN_LABEL} submitErrorMessage={SIGN_IN_ERROR_MESSAGE} />;
}

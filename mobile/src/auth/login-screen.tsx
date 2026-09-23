import { useAuth } from "./auth-provider";
import { LoginForm } from "./login-form";

/** Connect the login form to shared authentication state. */
export function LoginScreen() {
  const { signIn } = useAuth();

  return <LoginForm onSubmit={signIn} />;
}

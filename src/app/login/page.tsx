import { AuthForm } from "@/components/auth-form";
import { login } from "@/lib/auth-actions";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return <AuthForm mode="login" action={login} />;
}

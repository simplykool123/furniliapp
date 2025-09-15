import LoginSimple from "@/pages/LoginSimple";

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  return <LoginSimple />;
}
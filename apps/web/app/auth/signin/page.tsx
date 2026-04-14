import Link from "next/link";
import { Container, PageHeader } from "@faang-quant/ui";
import { LoginForm } from "../../../components/login-form";

export default function SignInPage() {
  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Authentication"
        title="Sign in"
        description="Use the account you created to manage saved searches, favorites, and alert preferences."
      />
      <div className="space-y-4">
        <LoginForm />
        <p className="text-sm text-slate-600">
          No account yet? <Link href="/auth/register" className="font-semibold text-brand-700">Create one here</Link>.
        </p>
      </div>
    </Container>
  );
}


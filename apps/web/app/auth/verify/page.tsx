import Link from "next/link";
import { Button, Card, CardContent, Container, PageHeader } from "@faang-quant/ui";
import { consumeVerificationToken } from "../../../lib/tokens";

export default async function VerifyPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams?.token[0]
    : resolvedSearchParams?.token;
  const sent =
    (Array.isArray(resolvedSearchParams?.sent)
      ? resolvedSearchParams?.sent[0]
      : resolvedSearchParams?.sent) === "1";
  const email = Array.isArray(resolvedSearchParams?.email)
    ? resolvedSearchParams?.email[0]
    : resolvedSearchParams?.email;
  const delivery = Array.isArray(resolvedSearchParams?.delivery)
    ? resolvedSearchParams?.delivery[0]
    : resolvedSearchParams?.delivery;
  const localToken = Array.isArray(resolvedSearchParams?.localToken)
    ? resolvedSearchParams?.localToken[0]
    : resolvedSearchParams?.localToken;
  const isConsoleDelivery = sent && delivery === "console" && Boolean(localToken);
  const result = token ? await consumeVerificationToken(token) : null;

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Verify Email"
        title={
          result
            ? "Your account is ready"
            : isConsoleDelivery
              ? "Verify your local account"
              : sent
                ? "Check your inbox"
                : "Verification required"
        }
        description={
          result
            ? "Email verification succeeded. You can sign in and start saving searches."
            : isConsoleDelivery
              ? "Email delivery is set to console mode, so no real email was sent."
              : sent
              ? `A verification link was sent to ${email ?? "your email address"}.`
              : "Verification links expire after 24 hours."
        }
      />
      <Card className="max-w-xl">
        <CardContent className="space-y-4">
          {result ? (
            <Button asChild>
              <Link href="/auth/signin">Go to sign in</Link>
            </Button>
          ) : isConsoleDelivery ? (
            <>
              <p className="text-sm text-slate-600">
                Console mode is intended for local development. Use the button below to finish
                verification on this machine.
              </p>
              <Button asChild>
                <Link href={`/auth/verify?token=${encodeURIComponent(localToken!)}`}>
                  Verify account locally
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-slate-600">
              Check your spam folder. If the link expired, go back to registration and submit the
              same email again to resend a fresh verification link.
            </p>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

import { Button, Card, CardContent, Container, Input, PageHeader } from "@faang-quant/ui";
import { registerUserAction } from "../../../lib/actions";

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const error = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error;

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Create Account"
        title="Set up alerts and saved searches"
        description="Account creation uses email verification before alerts can be sent."
      />
      <Card className="max-w-xl">
        <CardContent className="space-y-4">
          <form action={registerUserAction} className="space-y-4">
            <Input name="name" placeholder="Your name" />
            <Input name="email" type="email" placeholder="Email address" required />
            <Input name="password" type="password" placeholder="Password (8+ characters)" required />
            {error ? (
              <p className="text-sm text-rose-600">
                {error === "email-in-use"
                  ? "That email is already registered and verified."
                  : "Unable to create the account. Check your inputs and try again."}
              </p>
            ) : null}
            <Button type="submit">Create account</Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

import { Button, Card, CardContent, Container, PageHeader } from "@swe-quant/ui";
import { unsubscribeAction } from "../../lib/actions";

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams?.token[0]
    : resolvedSearchParams?.token;
  const success =
    (Array.isArray(resolvedSearchParams?.success)
      ? resolvedSearchParams?.success[0]
      : resolvedSearchParams?.success) === "1";
  const error = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams?.error;

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        title={success ? "Alerts disabled" : "Unsubscribe from email alerts"}
      />
      <Card className="max-w-xl">
        <CardContent className="space-y-4">
          {!success && token ? (
            <form action={unsubscribeAction}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit">Disable alert emails</Button>
            </form>
          ) : null}
          {!success && (!token || error) ? (
            <p className="text-sm text-rose-600">
              This unsubscribe link is missing or invalid. Use the link from your latest alert email.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Container>
  );
}

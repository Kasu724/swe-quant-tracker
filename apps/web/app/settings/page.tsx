import { Button, Card, CardContent, Container, Input, PageHeader } from "@faang-quant/ui";
import { updateSettingsAction } from "../../lib/actions";
import { getCurrentUser, requireUser } from "../../lib/auth";

export default async function SettingsPage() {
  await requireUser();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Preferences"
        title="Alert settings"
        description="Control email delivery and your digest timezone."
      />
      <Card className="max-w-xl">
        <CardContent className="space-y-4">
          <form action={updateSettingsAction} className="space-y-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Signed in as <span className="font-semibold text-slate-900">{user.email}</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="alertEmailsEnabled" defaultChecked={user.alertEmailsEnabled} />
              Email alerts enabled
            </label>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Digest timezone</label>
              <Input
                name="digestTimezone"
                defaultValue={user.digestTimezone}
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>
            <Button type="submit">Save settings</Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

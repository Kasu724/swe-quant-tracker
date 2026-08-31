import { Button, Card, CardContent, Container, Input, PageHeader } from "@faang-quant/ui";
import { PortableDataManager } from "../../components/portable-data-manager";
import { updateSettingsAction } from "../../lib/actions";
import { getLocalProfile, isPlaceholderLocalEmail } from "../../lib/local-profile";

export default async function SettingsPage() {
  const user = await getLocalProfile();

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        eyebrow="Preferences"
        title="Local settings and backups"
        description="Manage notifications and move your tracker configuration between machines."
      />
      <Card className="max-w-xl">
        <CardContent className="space-y-4">
          <form action={updateSettingsAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Notification email (optional)</label>
              <Input
                name="notificationEmail"
                type="email"
                defaultValue={isPlaceholderLocalEmail(user.email) ? "" : user.email}
                placeholder="you@example.com"
                maxLength={320}
                autoComplete="email"
              />
              <p className="text-xs text-slate-500">This is only an alert destination. It is not an account or sign-in.</p>
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
      <Card className="max-w-3xl">
        <CardContent className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Portable backup</h2>
            <p className="mt-1 text-sm text-slate-600">
              Export settings, saved searches, saved jobs, application progress, companies, and source configuration as versioned JSON.
              Raw posting caches and ingestion logs are intentionally excluded.
            </p>
          </div>
          <PortableDataManager />
        </CardContent>
      </Card>
    </Container>
  );
}

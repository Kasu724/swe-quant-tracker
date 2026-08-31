import Link from "next/link";
import { Badge, Button, Card, CardContent, Container, EmptyState, PageHeader } from "@faang-quant/ui";
import { deleteSavedSearchAction } from "../../lib/actions";
import { getLocalProfile } from "../../lib/local-profile";
import { getUserFavorites, getUserSavedSearches } from "../../lib/queries";
import { IntentLink } from "../../components/site-nav-link";

export default async function SavedSearchesPage() {
  const user = await getLocalProfile();
  const [savedSearches, favorites] = await Promise.all([
    getUserSavedSearches(user.id),
    getUserFavorites(user.id)
  ]);

  return (
    <Container className="space-y-10 py-12">
      <PageHeader
        title="Saved searches and favorites"
      />

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Saved searches</h2>
        {savedSearches.length === 0 ? (
          <EmptyState
            title="No saved searches yet"
            description="Run a search from the internships page and save it for immediate or daily alerts."
          >
            <Button asChild>
              <Link href="/internships">Browse internships</Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="grid gap-4">
            {savedSearches.map((search) => (
              <Card key={search.id}>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{search.alertCadence}</Badge>
                      {search.alertsEnabled ? <Badge tone="success">Alerts on</Badge> : <Badge>Alerts off</Badge>}
                    </div>
                    <div className="text-xl font-semibold text-ink">{search.name}</div>
                    <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                      {JSON.stringify(search.filterJson, null, 2)}
                    </pre>
                  </div>
                  <form action={deleteSavedSearchAction}>
                    <input type="hidden" name="savedSearchId" value={search.id} />
                    <Button variant="secondary" type="submit">
                      Delete
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Favorites</h2>
        {favorites.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            description="Favorite internships from the listings page to keep a shortlist here."
          />
        ) : (
          <div className="grid gap-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id}>
                <CardContent className="space-y-2">
                  <IntentLink href={`/internships/${favorite.internshipPosting.slug}`} className="font-display text-xl font-semibold hover:text-brand-700">
                    {favorite.internshipPosting.title}
                  </IntentLink>
                  <div className="text-sm text-slate-600">
                    {favorite.internshipPosting.companyNameSnapshot} · {favorite.internshipPosting.locationRaw ?? "Location not listed"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}

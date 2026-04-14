import { redirect } from "next/navigation";
import { buildSearchQuery } from "../../components/internships-feed-page";

export default async function InternshipsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const queryString = buildSearchQuery(resolvedSearchParams);

  redirect(queryString ? `/?${queryString}` : "/");
}

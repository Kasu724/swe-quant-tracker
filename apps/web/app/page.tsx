import { InternshipsFeedPage } from "../components/internships-feed-page";

export default function HomePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <InternshipsFeedPage searchParams={searchParams} basePath="/" />;
}

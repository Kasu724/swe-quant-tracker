import Link from "next/link";
import { Button, Container, EmptyState, PageHeader } from "@faang-quant/ui";
import { PostingListCard } from "../../components/posting-list-card";
import { getLocalProfile } from "../../lib/local-profile";
import { getUserPostingList } from "../../lib/queries";

export default async function ListPage() {
  const user = await getLocalProfile();
  const items = await getUserPostingList(user.id);

  return (
    <Container className="space-y-8 py-12">
      <PageHeader
        title="List"
        actions={
          <Button asChild>
            <Link href="/">Browse internships</Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Your list is empty"
          description="Use the plus icon in the internships feed to add roles you want to apply to."
        >
          <Button asChild>
            <Link href="/">Browse internships</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <PostingListCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </Container>
  );
}

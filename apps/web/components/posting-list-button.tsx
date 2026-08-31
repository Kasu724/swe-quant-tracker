"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@faang-quant/ui";

export function PostingListButton({
  postingId,
  initialListed
}: {
  postingId: string;
  initialListed: boolean;
}) {
  const [isListed, setIsListed] = useState(initialListed);
  const [isPending, setIsPending] = useState(false);

  async function toggleList() {
    if (isPending) {
      return;
    }

    const nextListed = !isListed;
    setIsListed(nextListed);
    setIsPending(true);

    try {
      const response = await fetch("/api/list", {
        method: nextListed ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ postingId })
      });

      if (!response.ok) {
        throw new Error("Unable to update list");
      }
    } catch {
      setIsListed(!nextListed);
    } finally {
      setIsPending(false);
    }
  }

  const label = isListed ? "Remove from list" : "Add to list";

  return (
    <Button
      type="button"
      variant={isListed ? "secondary" : "ghost"}
      className="h-10 w-10 shrink-0 p-0"
      aria-label={label}
      title={label}
      aria-pressed={isListed}
      disabled={isPending}
      onClick={() => void toggleList()}
    >
      {isListed ? <Check className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}
    </Button>
  );
}

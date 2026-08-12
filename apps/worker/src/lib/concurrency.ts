export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  handler: (item: T) => Promise<void>
) {
  const workerCount = Math.min(
    items.length,
    Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 1
  );
  let nextIndex = 0;

  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const itemIndex = nextIndex;
      nextIndex += 1;
      await handler(items[itemIndex]!);
    }
  });

  await Promise.all(workers);
}


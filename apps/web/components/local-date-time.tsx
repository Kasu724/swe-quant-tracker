"use client";

import { useEffect, useState } from "react";

export function LocalDateTime({ value }: { value: string }) {
  const [formatted, setFormatted] = useState("Loading local time…");
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
    setFormatted(formatter.format(new Date(value)));
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
  }, [value]);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {formatted}
      {timeZone ? ` (${timeZone})` : ""}
    </time>
  );
}

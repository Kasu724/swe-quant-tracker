"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressState = "idle" | "loading" | "complete";

export function NavigationProgress() {
  const [state, setState] = useState<ProgressState>("idle");
  const navigationStarted = useRef(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const link = target?.closest("a");

      if (
        !link ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      ) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (
        nextUrl.origin !== currentUrl.origin ||
        (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search)
      ) {
        return;
      }

      navigationStarted.current = true;
      setState("loading");
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (!navigationStarted.current) {
      return;
    }

    navigationStarted.current = false;
    setState("complete");

    const timeout = window.setTimeout(() => setState("idle"), 260);
    return () => window.clearTimeout(timeout);
  }, [pathname, search]);

  return (
    <div className="navigation-progress" data-state={state} aria-hidden="true">
      <div className="navigation-progress__bar" />
    </div>
  );
}

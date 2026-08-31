"use client";

import Link, { type LinkProps } from "next/link";
import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

type SiteNavLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

/**
 * Keep the header light on first paint, then warm a destination only when the
 * user shows intent to visit it. This avoids six dynamic route requests on
 * every page load while preserving instant-feeling navigation for mouse and
 * keyboard users.
 */
export function IntentLink({ href, onMouseEnter, onFocus, ...props }: SiteNavLinkProps) {
  const router = useRouter();
  const prefetched = useRef(false);

  const prefetchOnIntent = useCallback(() => {
    if (prefetched.current) {
      return;
    }

    prefetched.current = true;
    router.prefetch(href.toString());
  }, [href, router]);

  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    prefetchOnIntent();
    onMouseEnter?.(event);
  };

  const handleFocus = (event: React.FocusEvent<HTMLAnchorElement>) => {
    prefetchOnIntent();
    onFocus?.(event);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
    />
  );
}

export const SiteNavLink = IntentLink;

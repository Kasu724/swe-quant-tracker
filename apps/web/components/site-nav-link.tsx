"use client";

import Link, { type LinkProps } from "next/link";
import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  AnchorHTMLAttributes,
  FocusEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent
} from "react";

type SiteNavLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

/**
 * Detail links are intentionally warmed only when the user shows intent to
 * visit them. There can be many of these links on a feed, so prefetching every
 * detail route on render would create a request storm.
 */
export function IntentLink({
  href,
  onMouseEnter,
  onFocus,
  onPointerEnter,
  onTouchStart,
  ...props
}: SiteNavLinkProps) {
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

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    prefetchOnIntent();
    onFocus?.(event);
  };

  const handlePointerEnter = (event: PointerEvent<HTMLAnchorElement>) => {
    prefetchOnIntent();
    onPointerEnter?.(event);
  };

  const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    prefetchOnIntent();
    onTouchStart?.(event);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onPointerEnter={handlePointerEnter}
      onTouchStart={handleTouchStart}
    />
  );
}

/**
 * Persistent navigation uses Next's standard prefetch behavior. Unlike
 * IntentLink, this is a small fixed set of destinations and should be ready
 * before the user clicks.
 */
export function SiteNavLink(props: SiteNavLinkProps) {
  return <Link {...props} />;
}

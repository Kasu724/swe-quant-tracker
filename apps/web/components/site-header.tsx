import Link from "next/link";
import { Database, ListChecks } from "lucide-react";
import { Button } from "@faang-quant/ui";
import { ThemeToggle } from "./theme-toggle";
import { SiteNavLink } from "./site-nav-link";
import { NavigationProgress } from "./navigation-progress";

const navLinks = [
  { href: "/", label: "Internships" },
  { href: "/list", label: "List" },
  { href: "/companies", label: "Companies" },
  { href: "/saved-searches", label: "Saved" },
  { href: "/admin", label: "Sources" },
  { href: "/settings", label: "Settings" }
];

export function SiteHeader() {
  return (
    <header className="relative sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="grid min-h-20 w-full grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 justify-self-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white">
            SQ
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="truncate font-display text-lg font-semibold text-ink">
              SWE + Quant Internship Tracker
            </div>
            <div className="truncate text-xs text-slate-500">
              Open-source internship discovery
            </div>
          </div>
        </Link>

        <nav className="hidden items-center justify-center gap-5 md:flex">
          {navLinks.map((link) => (
            <SiteNavLink
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-brand-700"
            >
              {link.label}
            </SiteNavLink>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <Button
            variant="ghost"
            asChild
            className="h-10 w-10 p-0 md:hidden"
            title="Open list"
          >
            <Link href="/list" aria-label="Open list">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden h-10 w-10 p-0 sm:inline-flex" title="Manage data sources">
            <Link href="/admin" aria-label="Manage data sources">
              <Database className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <nav
        aria-label="Primary navigation"
        className="flex gap-5 overflow-x-auto border-t border-slate-100 px-4 py-3 md:hidden"
      >
        {navLinks.map((link) => (
          <SiteNavLink
            key={link.href}
            href={link.href}
            className="shrink-0 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-brand-700"
          >
            {link.label}
          </SiteNavLink>
        ))}
      </nav>
      <NavigationProgress />
    </header>
  );
}

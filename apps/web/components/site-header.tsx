import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Badge, Button, Container } from "@faang-quant/ui";
import type { Session } from "next-auth";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "/", label: "Internships" },
  { href: "/list", label: "List" },
  { href: "/companies", label: "Companies" },
  { href: "/saved-searches", label: "Saved Searches" },
  { href: "/settings", label: "Settings" }
];

export function SiteHeader({ session }: { session: Session | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <Container className="flex min-h-20 items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-sm font-bold text-white">
              IQ
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-ink">Internship Quant Tracker</div>
              <div className="text-xs text-slate-500">FAANG, big tech, quant, and trading roles</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 hover:text-brand-700">
                {link.label}
              </Link>
            ))}
            {session?.user.role === "ADMIN" ? (
              <Link href="/admin" className="text-sm font-medium text-slate-600 hover:text-brand-700">
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
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
          <Badge tone="brand">Student Roles Only</Badge>
          {session ? (
            <>
              <span className="hidden text-sm text-slate-600 md:inline">{session.user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}

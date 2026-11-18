import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/layout/brand-mark";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/help", label: "Help" },
];

/** Public header used on the content pages (the landing page keeps its own in-page anchors). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="FairSplit home" className="rounded-md">
          <BrandLockup />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { BrandLockup } from "@/components/layout/brand-mark";

export const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How the split works" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help and FAQs" },
      { href: "/resources/lease-addendum", label: "Lease addendum template" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

/** Footer for the public content pages. */
export function SiteFooter() {
  return (
    <footer className="bg-rail text-rail-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-4">
          <Link href="/" aria-label="FairSplit home" className="inline-block rounded-md focus-visible:ring-offset-rail">
            <BrandLockup tone="rail" />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-rail-muted">
            Shared utility bills, split by the days each tenant actually lived there.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="font-sans text-sm font-semibold tracking-normal text-rail-active-foreground">
                {group.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-sm hover:text-rail-active-foreground focus-visible:ring-offset-rail"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-rail-muted sm:px-6 lg:px-8">
        © 2026 Hymavar. FairSplit is a calculator and tracker, not legal advice. Check your lease
        and local utility rules.
      </p>
    </footer>
  );
}

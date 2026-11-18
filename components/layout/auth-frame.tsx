import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLockup } from "./brand-mark";

interface AuthFrameProps {
  title?: string;
  description?: React.ReactNode;
  /** Short statement shown on the ink panel (desktop only). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const defaultAside = (
  <>
    <p className="font-display text-3xl font-bold leading-tight text-rail-active-foreground">
      Everyone pays for the days they lived there.
    </p>
    <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-rail-border pt-6">
      <div>
        <dt className="text-xs text-rail-muted">Bill</dt>
        <dd className="figure mt-1 text-lg text-rail-active-foreground">$220.00</dd>
      </div>
      <div>
        <dt className="text-xs text-rail-muted">Person-days</dt>
        <dd className="figure mt-1 text-lg text-rail-active-foreground">110</dd>
      </div>
      <div>
        <dt className="text-xs text-rail-muted">Per day</dt>
        <dd className="figure mt-1 text-lg text-rail-accent">$2.00</dd>
      </div>
    </dl>
  </>
);

/** Two-panel frame for sign-in and invite screens. Phone-first: one column below lg. */
export function AuthFrame({ title, description, aside = defaultAside, children, className }: AuthFrameProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-rail p-12 text-rail-foreground lg:flex">
        <Link href="/" aria-label="FairSplit home" className="self-start rounded-md focus-visible:ring-offset-rail">
          <BrandLockup tone="rail" />
        </Link>
        <div className="max-w-md">{aside}</div>
        <p className="text-xs text-rail-muted">Tenants never pay for FairSplit.</p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10 lg:justify-center lg:px-16">
        <Link href="/" aria-label="FairSplit home" className="self-start rounded-md lg:hidden">
          <BrandLockup />
        </Link>
        <div className={cn("mx-auto mt-12 w-full max-w-sm lg:mt-0", className)}>
          {title && <h1 className="text-3xl font-bold leading-tight">{title}</h1>}
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
          <div className={title || description ? "mt-8" : undefined}>{children}</div>
        </div>
      </main>
    </div>
  );
}

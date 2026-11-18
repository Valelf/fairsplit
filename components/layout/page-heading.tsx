import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeadingProps {
  title: React.ReactNode;
  /** Short line under the title: property name, scope, count. */
  description?: React.ReactNode;
  /** Back link shown above the title (phone-friendly, no cramped icon row). */
  backHref?: string;
  backLabel?: string;
  /** Pills next to the title (cycle status, role). */
  badges?: React.ReactNode;
  /** Buttons; wrap below the title on phones, sit right on wider screens. */
  actions?: React.ReactNode;
  className?: string;
}

/** Page header: optional back link, display title + pills, description, actions. */
export function PageHeading({
  title,
  description,
  backHref,
  backLabel = "Back",
  badges,
  actions,
  className,
}: PageHeadingProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {badges}
          </div>
          {description && <p className="text-sm text-muted-foreground sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

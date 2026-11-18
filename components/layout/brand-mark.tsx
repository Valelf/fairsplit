import { cn } from "@/lib/utils";

interface BrandGlyphProps {
  className?: string;
}

/**
 * The FairSplit glyph: a statement sheet divided down the middle, with
 * line items on each side. Decorative — pair it with the wordmark or a label.
 */
export function BrandGlyph({ className }: BrandGlyphProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      className={cn("h-7 w-7 shrink-0", className)}
    >
      <rect x="1" y="1" width="26" height="26" rx="7" className="fill-primary" />
      <path d="M14 6v16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M7 10h4M7 14h4M7 18h2M17 10h4M17 14h3M17 18h4"
        stroke="white"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface BrandLockupProps {
  /** Show the small "by Hymavar" byline. */
  showByline?: boolean;
  /** "light" for paper backgrounds, "rail" for the dark ink rail. */
  tone?: "light" | "rail";
  className?: string;
}

export function BrandLockup({ showByline = true, tone = "light", className }: BrandLockupProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandGlyph />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            tone === "rail" ? "text-rail-active-foreground" : "text-foreground"
          )}
        >
          FairSplit
        </span>
        {showByline && (
          <span
            className={cn(
              "mt-0.5 text-xs",
              tone === "rail" ? "text-rail-muted" : "text-muted-foreground"
            )}
          >
            by Hymavar
          </span>
        )}
      </span>
    </span>
  );
}

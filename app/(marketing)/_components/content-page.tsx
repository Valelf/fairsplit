import { cn } from "@/lib/utils";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export interface TocItem {
  id: string;
  label: string;
}

interface ContentPageProps {
  title: string;
  lede?: React.ReactNode;
  /** Small line under the lede, e.g. "Last updated …". */
  meta?: React.ReactNode;
  /** Shown above the title, e.g. the draft banner. */
  notice?: React.ReactNode;
  /** Section links shown beside the content on wide screens. */
  toc?: TocItem[];
  children: React.ReactNode;
}

/**
 * Prose styles for long-form pages. Tailwind only: headings, paragraphs, lists
 * and links inside the body pick these up without a typography plugin.
 */
export const proseClass = cn(
  "max-w-prose text-base leading-relaxed text-foreground",
  "[&_h2]:mt-14 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight sm:[&_h2]:text-3xl",
  "[&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_p]:mt-4 [&_p]:text-muted-foreground",
  "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-muted-foreground",
  "[&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-muted-foreground",
  "[&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:rounded-sm [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-4 hover:[&_a]:decoration-primary"
);

/** Template for public long-form pages: header, title block, optional contents rail, footer. */
export function ContentPage({ title, lede, meta, notice, toc, children }: ContentPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="content" className="flex-1">
        <div className="border-b bg-card">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-16 lg:px-8">
            {notice && <div className="mb-8 max-w-3xl">{notice}</div>}
            <h1 className="max-w-3xl text-4xl font-bold leading-none sm:text-5xl">{title}</h1>
            {lede && <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{lede}</p>}
            {meta && <p className="mt-4 text-sm text-muted-foreground">{meta}</p>}
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-12 lg:px-8">
          {toc && toc.length > 0 && (
            <nav aria-label="On this page" className="hidden lg:col-span-3 lg:block">
              <div className="sticky top-24">
                <p className="text-sm font-semibold">On this page</p>
                <ul className="mt-3 flex flex-col gap-2 border-l text-sm">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="-ml-px block rounded-sm border-l border-transparent pl-3 text-muted-foreground hover:border-primary hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
          <div className={cn("min-w-0", toc && toc.length > 0 ? "lg:col-span-9" : "lg:col-span-12")}>
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

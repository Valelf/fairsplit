import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/layout/brand-mark";
import { SplitStatement, type StatementResident } from "./_components/split-statement";

const heroResidents: StatementResident[] = [
  { name: "Navya", from: 0, to: 29, shareCents: 6000 },
  { name: "Vineesh", from: 0, to: 29, shareCents: 6000 },
  { name: "Val", from: 0, to: 29, shareCents: 6000 },
  { name: "Anil", from: 0, to: 16, shareCents: 3400, note: "Moved out Oct 30" },
  { name: "Divya", from: 27, to: 29, shareCents: 600, note: "Moved in Nov 10" },
];

const steps = [
  {
    title: "Add the bill",
    body: "Type in the amount and service dates, or upload the PDF and let FairSplit read the provider, amount and dates for you to confirm.",
  },
  {
    title: "Split by person-days",
    body: "Each tenant is charged for the days they actually lived there. Move-ins and move-outs mid-cycle are handled, and shares add up to the cent.",
  },
  {
    title: "Tenants see the math",
    body: "Every tenant gets their amount, the days counted and the rate per day, plus your Venmo, Zelle or Cash App details.",
  },
  {
    title: "Track who has paid",
    body: "Tenants mark their share paid, you confirm it. Outstanding balances stay in one place instead of a group chat.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    summary: "For one house you run yourself.",
    features: [
      "1 property, unlimited tenants",
      "Enter bills by hand",
      "Person-days splits with the math shown",
      "Payment links and paid / confirmed tracking",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "per property / month",
    summary: "For landlords with more than one house.",
    features: [
      "Everything in Free, for every property",
      "AI bill import from PDFs",
      "Payment reminders for overdue shares",
      "Monthly statements and full history",
    ],
    cta: "Get started",
    featured: true,
  },
];

const faqs = [
  {
    q: "What is a person-day?",
    a: "One person living in the house for one day. Three tenants there for a whole 30-day bill make 90 person-days. The bill is divided by the total person-days, and each tenant pays for their own.",
  },
  {
    q: "What happens when someone moves in or out mid-cycle?",
    a: "They pay only for the days they lived there. In the example above, Anil left on Oct 30 and pays for 17 days; Divya arrived on Nov 10 and pays for 3.",
  },
  {
    q: "Do tenants pay for FairSplit?",
    a: "No. Tenants are always free. Landlords pay per property on Pro, and the first property is free.",
  },
  {
    q: "Does FairSplit hold or move money?",
    a: "No. Tenants pay you directly with the method you already use. FairSplit tracks who has paid and who still owes.",
  },
  {
    q: "What if a bill doesn't divide evenly to the cent?",
    a: "Leftover cents go to the largest fractional shares, so every split adds up exactly to the bill. Nobody is charged a rounding error.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="FairSplit home" className="rounded-md">
            <BrandLockup />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm md:flex">
            <a href="#how" className="rounded-sm text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="rounded-sm text-muted-foreground hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="rounded-sm text-muted-foreground hover:text-foreground">
              Questions
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-20 lg:grid-cols-12 lg:gap-12 lg:px-8">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <p className="text-sm font-medium text-primary">For landlords who rent by the room</p>
            <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl lg:text-6xl">
              Utility bills, split by the day.
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              Add the electric, water and internet bills. FairSplit charges each tenant for the days
              they actually lived there, shows them the math, and tracks who has paid.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">Set up your first house</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Free for one property. Tenants never pay.
            </p>
          </div>

          <div className="lg:col-span-7">
            <SplitStatement
              provider="CoServ electricity"
              periodLabel="Oct 14 – Nov 12 · 30 days"
              totalCents={22000}
              days={30}
              axis={[
                [0, "Oct 14"],
                [18, "Nov 1"],
                [29, "Nov 12"],
              ]}
              residents={heroResidents}
              footnote={
                <p>
                  Divya moved in on Nov 10, so she pays for{" "}
                  <span className="figure text-foreground">3 days × $2.00 = $6.00</span>. Anil moved
                  out on Oct 30:{" "}
                  <span className="figure text-foreground">17 days × $2.00 = $34.00</span>.
                </p>
              }
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-16 border-y bg-card">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="how-title" className="text-3xl font-bold sm:text-4xl">
                One loop a month
              </h2>
              <p className="mt-3 text-muted-foreground">
                The same four steps every billing cycle, for every house.{" "}
                <Link href="/how-it-works" className="rounded-sm font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                  See the math worked through
                </Link>
              </p>
            </div>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-3 border-t-2 border-primary pt-4">
                  <span className="figure text-sm text-primary">Step {i + 1}</span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="pricing-title" className="text-3xl font-bold sm:text-4xl">
                Pay per house. Tenants are free.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Utilities pass through at cost. FairSplit never adds a markup to a bill.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  aria-labelledby={`plan-${plan.name}`}
                  className={
                    plan.featured
                      ? "flex flex-col gap-6 rounded-2xl bg-rail p-6 text-rail-foreground sm:p-8"
                      : "flex flex-col gap-6 rounded-2xl border bg-card p-6 sm:p-8"
                  }
                >
                  <div className="flex flex-col gap-1">
                    <h3
                      id={`plan-${plan.name}`}
                      className={
                        plan.featured ? "text-xl font-bold text-rail-active-foreground" : "text-xl font-bold"
                      }
                    >
                      {plan.name}
                    </h3>
                    <p className={plan.featured ? "text-sm text-rail-muted" : "text-sm text-muted-foreground"}>
                      {plan.summary}
                    </p>
                  </div>
                  <p className="flex items-baseline gap-2">
                    <span
                      className={
                        plan.featured
                          ? "figure text-5xl font-medium text-rail-active-foreground"
                          : "figure text-5xl font-medium"
                      }
                    >
                      {plan.price}
                    </span>
                    <span className={plan.featured ? "text-sm text-rail-muted" : "text-sm text-muted-foreground"}>
                      {plan.cadence}
                    </span>
                  </p>
                  <ul className="flex flex-1 flex-col gap-3 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-3">
                        <Check
                          aria-hidden="true"
                          className={plan.featured ? "mt-0.5 h-4 w-4 shrink-0 text-rail-accent" : "mt-0.5 h-4 w-4 shrink-0 text-primary"}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    variant={plan.featured ? "default" : "outline"}
                    className={plan.featured ? "focus-visible:ring-offset-rail" : undefined}
                  >
                    <Link href="/login">{plan.cta}</Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-12 lg:px-8">
            <h2 id="faq-title" className="text-3xl font-bold sm:text-4xl lg:col-span-4">
              Questions landlords ask
            </h2>
            <div className="divide-y border-y lg:col-span-8">
              {faqs.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="max-w-prose pb-5 text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-rail text-rail-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandLockup tone="rail" />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#how" className="rounded-sm hover:text-rail-active-foreground">How it works</a>
            <a href="#pricing" className="rounded-sm hover:text-rail-active-foreground">Pricing</a>
            <a href="#faq" className="rounded-sm hover:text-rail-active-foreground">Questions</a>
            <Link href="/how-it-works" className="rounded-sm hover:text-rail-active-foreground">The split, explained</Link>
            <Link href="/help" className="rounded-sm hover:text-rail-active-foreground">Help</Link>
            <Link href="/resources/lease-addendum" className="rounded-sm hover:text-rail-active-foreground">Lease addendum</Link>
            <Link href="/terms" className="rounded-sm hover:text-rail-active-foreground">Terms</Link>
            <Link href="/privacy" className="rounded-sm hover:text-rail-active-foreground">Privacy</Link>
            <Link href="/login" className="rounded-sm hover:text-rail-active-foreground">Sign in</Link>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-rail-muted sm:px-6 lg:px-8">
          © 2026 Hymavar. FairSplit is a calculator and tracker, not legal advice. Check your lease
          and local utility rules.
        </p>
      </footer>
    </div>
  );
}

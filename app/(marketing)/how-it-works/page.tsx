import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContentPage, proseClass, type TocItem } from "../_components/content-page";
import { SplitStatement, type StatementResident } from "../_components/split-statement";

export const metadata: Metadata = {
  title: "How the split works — FairSplit",
  description:
    "FairSplit divides each utility bill by person-days: the days each tenant actually lived in the house during the bill's service period. See a worked example, the rounding rule and what tenants see.",
};

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const residents: StatementResident[] = [
  { name: "Navya", from: 0, to: 29, shareCents: 6000 },
  { name: "Vineesh", from: 0, to: 29, shareCents: 6000 },
  { name: "Val", from: 0, to: 29, shareCents: 6000 },
  { name: "Anil", from: 0, to: 16, shareCents: 3400, note: "Moved out Oct 30" },
  { name: "Divya", from: 27, to: 29, shareCents: 600, note: "Moved in Nov 10" },
];

const ledger = [
  { name: "Navya", span: "Oct 14 – Nov 12", days: 30 },
  { name: "Vineesh", span: "Oct 14 – Nov 12", days: 30 },
  { name: "Val", span: "Oct 14 – Nov 12", days: 30 },
  { name: "Anil", span: "Oct 14 – Oct 30", days: 17 },
  { name: "Divya", span: "Nov 10 – Nov 12", days: 3 },
];

const roundingRows = [
  { name: "Tenant A", days: 30, exact: "3,896.10", floor: 3896, extra: 0 },
  { name: "Tenant B", days: 30, exact: "3,896.10", floor: 3896, extra: 0 },
  { name: "Tenant C", days: 17, exact: "2,207.79", floor: 2207, extra: 1 },
];

const toc: TocItem[] = [
  { id: "rule", label: "The rule" },
  { id: "example", label: "A real bill, worked through" },
  { id: "counting", label: "How days are counted" },
  { id: "rounding", label: "Rounding to the cent" },
  { id: "tenants", label: "What tenants see" },
  { id: "fairer", label: "Why not split it equally?" },
];

export default function HowItWorksPage() {
  return (
    <ContentPage
      title="How the split works"
      lede="Every shared utility bill is divided by person-days: one person living in the house for one day. Each tenant pays for the days they were actually there, and nothing else."
      toc={toc}
    >
      <div className={proseClass}>
        <section aria-labelledby="rule">
          <h2 id="rule" className="!mt-0">The rule</h2>
          <p>
            A bill covers a service period, say October 14 to November 12. For every tenant, FairSplit
            counts the days in that period they lived in the house. Add those up and you get the
            bill&apos;s total person-days.
          </p>
        </section>
      </div>

      {/* The formula, set as a statement line rather than prose */}
      <div className="mt-6 max-w-prose rounded-xl border bg-card p-5 sm:p-6">
        <p className="figure text-sm leading-loose sm:text-base">
          <span className="text-muted-foreground">rate per day</span> = bill ÷ total person-days
          <br />
          <span className="text-muted-foreground">your share</span> = your days × rate per day
        </p>
      </div>

      <div className={proseClass}>
        <p>
          The landlord never picks the numbers by hand. Add the bill with its service dates, and the
          split follows from the move-in and move-out dates already on file.
        </p>

        <section aria-labelledby="example">
          <h2 id="example">A real bill, worked through</h2>
          <p>
            This is a CoServ electricity bill from a five-bedroom house in Texas. Three tenants lived
            there the whole period. Anil moved out partway through, and Divya moved in near the end.
          </p>
        </section>
      </div>

      <SplitStatement
        className="mt-8 max-w-3xl shadow-none"
        provider="CoServ electricity"
        periodLabel="Oct 14 – Nov 12 · 30 days"
        totalCents={22000}
        days={30}
        axis={[
          [0, "Oct 14"],
          [18, "Nov 1"],
          [29, "Nov 12"],
        ]}
        residents={residents}
      />

      <ol className="mt-10 grid max-w-3xl gap-8">
        <li className="grid gap-3 border-t-2 border-primary pt-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
          <p className="figure text-sm text-primary">Step 1</p>
          <div>
            <h3 className="text-lg font-semibold">Count each tenant&apos;s days</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[20rem] text-sm">
                <caption className="sr-only">Days each tenant lived in the house during the bill period</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Tenant</th>
                    <th scope="col" className="py-2 pr-4 font-medium">In the house</th>
                    <th scope="col" className="py-2 text-right font-medium">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.name} className="border-b border-dashed">
                      <th scope="row" className="py-2 pr-4 text-left font-medium">{row.name}</th>
                      <td className="figure py-2 pr-4 text-muted-foreground">{row.span}</td>
                      <td className="figure py-2 text-right">{row.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </li>
        <li className="grid gap-3 border-t-2 border-primary pt-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
          <p className="figure text-sm text-primary">Step 2</p>
          <div>
            <h3 className="text-lg font-semibold">Add them up</h3>
            <p className="figure mt-2 text-muted-foreground">
              30 + 30 + 30 + 17 + 3 = <span className="text-foreground">110 person-days</span>
            </p>
          </div>
        </li>
        <li className="grid gap-3 border-t-2 border-primary pt-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
          <p className="figure text-sm text-primary">Step 3</p>
          <div>
            <h3 className="text-lg font-semibold">Find the rate per day</h3>
            <p className="figure mt-2 text-muted-foreground">
              $220.00 ÷ 110 = <span className="text-foreground">$2.00 per person-day</span>
            </p>
          </div>
        </li>
        <li className="grid gap-3 border-t-2 border-primary pt-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
          <p className="figure text-sm text-primary">Step 4</p>
          <div>
            <h3 className="text-lg font-semibold">Multiply by each tenant&apos;s days</h3>
            <ul className="figure mt-2 flex flex-col gap-1 text-muted-foreground">
              <li>Navya, Vineesh, Val: 30 × $2.00 = <span className="text-foreground">$60.00 each</span></li>
              <li>Anil: 17 × $2.00 = <span className="text-foreground">$34.00</span></li>
              <li>Divya: 3 × $2.00 = <span className="text-foreground">$6.00</span></li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Check: $60 + $60 + $60 + $34 + $6 = <span className="figure text-foreground">$220.00</span>, the whole bill.
            </p>
          </div>
        </li>
      </ol>

      <div className={proseClass}>
        <section aria-labelledby="counting">
          <h2 id="counting">How days are counted</h2>
          <ul>
            <li>
              <strong>Move-in day counts.</strong> Divya moved in on November 10, so November 10, 11
              and 12 are hers: 3 days.
            </li>
            <li>
              <strong>Move-out day counts too.</strong> Anil moved out on October 30. He is charged
              from October 14 through October 30: 17 days.
            </li>
            <li>
              <strong>Only the bill&apos;s service period matters</strong>, not the date the bill
              arrived or was paid. A tenant who left before the period started pays nothing toward it.
            </li>
            <li>
              <strong>Dates are whole calendar days.</strong> There are no half days and no time
              zones to argue about.
            </li>
          </ul>
          <p>
            If a move date is wrong, the landlord fixes it on the tenant&apos;s record and FairSplit
            recalculates the open bills it affects.
          </p>
        </section>

        <section aria-labelledby="rounding">
          <h2 id="rounding">Rounding to the cent</h2>
          <p>
            Most bills don&apos;t divide evenly. FairSplit works out each share exactly, rounds every
            share down to whole cents, then hands the cents left over to the tenants with the largest
            fractions, one cent each. Ties go to the tenant with more days. The shares always add up to
            the bill exactly, so nobody, including the landlord, absorbs a rounding error.
          </p>
          <p>Here is a $100.00 bill split over 77 person-days:</p>
        </section>
      </div>

      <div className="mt-6 max-w-3xl overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="sr-only">Rounding a $100.00 bill split over 77 person-days</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Tenant</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Days</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Exact share</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Rounded down</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Charged</th>
            </tr>
          </thead>
          <tbody>
            {roundingRows.map((r) => (
              <tr key={r.name} className="border-b border-dashed last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">{r.name}</th>
                <td className="figure px-4 py-3 text-right">{r.days}</td>
                <td className="figure px-4 py-3 text-right text-muted-foreground">{r.exact}¢</td>
                <td className="figure px-4 py-3 text-right text-muted-foreground">{usd(r.floor)}</td>
                <td className="figure px-4 py-3 text-right font-medium">
                  {usd(r.floor + r.extra)}
                  {r.extra > 0 && <span className="ml-1 text-primary">+1¢</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50">
              <th scope="row" className="px-4 py-3 text-left font-medium">Total</th>
              <td className="figure px-4 py-3 text-right">77</td>
              <td className="figure px-4 py-3 text-right text-muted-foreground">10,000.00¢</td>
              <td className="figure px-4 py-3 text-right text-muted-foreground">$99.99</td>
              <td className="figure px-4 py-3 text-right font-medium">$100.00</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">
        Rounding down leaves one cent over. Tenant C&apos;s fraction (.79 of a cent) is larger than
        Tenant A&apos;s and B&apos;s (.10), so Tenant C pays the extra cent.
      </p>

      <div className={proseClass}>
        <section aria-labelledby="tenants">
          <h2 id="tenants">What tenants see</h2>
          <p>
            Tenants sign in with a link sent to their email. No password, and no fee. For each bill
            they see their own amount and how it was worked out:
          </p>
        </section>
      </div>

      <article
        aria-label="Example of a tenant's bill share"
        className="mt-6 max-w-sm rounded-2xl border bg-card p-5 sm:p-6"
      >
        <div className="flex items-baseline justify-between gap-4 border-b border-dashed pb-4">
          <div>
            <p className="font-semibold">CoServ electricity</p>
            <p className="figure text-xs text-muted-foreground">Oct 14 – Nov 12</p>
          </div>
          <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-soft-foreground">
            Unpaid
          </span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Divya, your share</p>
        <p className="figure text-4xl font-medium">$6.00</p>
        <p className="figure mt-1 text-sm text-muted-foreground">3 days × $2.00 per day</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed pt-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Whole bill</dt>
            <dd className="figure">$220.00</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">House total</dt>
            <dd className="figure">110 person-days</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">Pay your landlord with Venmo, Zelle or Cash App, then tap</p>
        <p className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          I&apos;ve paid
        </p>
      </article>

      <div className={proseClass}>
        <ul>
          <li>
            <strong>The math, not just a number:</strong> their days, the rate per day and the bill
            total, so they can check it themselves.
          </li>
          <li>
            <strong>How to pay:</strong> the landlord&apos;s Venmo, Zelle or Cash App details.
            FairSplit never holds or moves money.
          </li>
          <li>
            <strong>&ldquo;I&apos;ve paid&rdquo;:</strong> a tenant marks their share paid, and the
            landlord confirms it once the money arrives.
          </li>
          <li>
            <strong>Other tenants&apos; amounts, if the landlord allows it.</strong> A transparency
            setting on each property decides whether tenants see the whole house&apos;s split or only
            their own line.
          </li>
          <li>
            <strong>The original bill</strong>, when the landlord has uploaded it.
          </li>
        </ul>

        <section aria-labelledby="fairer">
          <h2 id="fairer">Why not split it equally?</h2>
          <p>
            Dividing by heads is simple until someone moves. Split the same $220.00 bill five ways and
            everyone owes $44.00, including Divya, who lived there for three days.
          </p>
        </section>
      </div>

      <div className="mt-6 max-w-3xl overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[26rem] text-sm">
          <caption className="sr-only">Equal split compared with person-days split for the CoServ bill</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Tenant</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Days</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Equal split</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Person-days</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Equal split per day</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((r) => (
              <tr key={r.name} className="border-b border-dashed last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">{r.name}</th>
                <td className="figure px-4 py-3 text-right">{r.days}</td>
                <td className="figure px-4 py-3 text-right text-muted-foreground">$44.00</td>
                <td className="figure px-4 py-3 text-right font-medium">{usd(r.days * 200)}</td>
                <td className="figure px-4 py-3 text-right text-muted-foreground">
                  {usd(Math.round(4400 / r.days))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={proseClass}>
        <p>
          Under an equal split, Divya pays about $14.67 a day while everyone else pays under $2.60.
          Under person-days, everyone pays the same $2.00 for each day they lived there. That is the
          whole idea: the same price per day, for everyone, every month.
        </p>
        <ul>
          <li>
            <strong>Nobody argues about move weeks.</strong> The dates on file settle it.
          </li>
          <li>
            <strong>Tenants can check the math</strong> instead of trusting a number in a text
            message.
          </li>
          <li>
            <strong>Landlords pass bills through at cost.</strong> The shares add up to the bill,
            exactly, with no markup.
          </li>
        </ul>
        <p>
          Want this written into your leases? Start from the{" "}
          <Link href="/resources/lease-addendum">utility allocation addendum template</Link>.
        </p>
      </div>

      <div className="mt-12 flex max-w-prose flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Set up your first house</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/help">Read the help pages</Link>
        </Button>
      </div>
    </ContentPage>
  );
}

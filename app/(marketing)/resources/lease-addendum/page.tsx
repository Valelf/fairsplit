import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, proseClass } from "../../_components/content-page";
import { DraftNotice } from "../../_components/draft-notice";
import { CopyTextButton } from "../../_components/copy-text-button";

export const metadata: Metadata = {
  title: "Utility allocation lease addendum template — FairSplit",
  description:
    "A copyable lease addendum template for splitting shared utilities by person-days: pass-through at cost, original bills on request, due dates and notice before changes.",
};

interface Clause {
  heading: string;
  body: string[];
}

const title = "Utility Allocation Addendum";

const preamble =
  "This Addendum is part of the Lease dated [lease date] between [Landlord name] (\"Landlord\") and [Tenant name] (\"Tenant\") for the room at [property address, room] (the \"Premises\"). If this Addendum conflicts with the Lease on the subject of utilities, this Addendum controls.";

const clauses: Clause[] = [
  {
    heading: "Shared utilities",
    body: [
      "The following utilities serve the whole property and are shared by its occupants: [electricity, water/sewer, gas, trash, internet]. Landlord holds these accounts. Tenant will pay a share of each as described below. Utilities not listed are [included in rent / Tenant's sole responsibility].",
    ],
  },
  {
    heading: "Person-days method",
    body: [
      "Each bill is divided by person-days. A person-day is one tenant occupying the property for one calendar day within the bill's service period.",
      "Tenant's days are counted from the later of the service period start or Tenant's move-in date, through the earlier of the service period end or Tenant's move-out date. The move-in day and the move-out day both count as full days.",
      "Rate per day = total bill amount ÷ total person-days for all tenants in the service period. Tenant's share = Tenant's days × rate per day.",
      "Shares are calculated in whole cents. Any cents left over after rounding each share down are assigned one cent at a time to the tenants with the largest remaining fractions, so that all shares add up exactly to the bill.",
    ],
  },
  {
    heading: "Pass-through at cost",
    body: [
      "Landlord will charge tenants only the amounts actually billed by the utility provider, including the provider's own taxes and fees. Landlord will not add any markup, administrative fee or service charge to utility shares. Late fees charged by a provider because of Landlord's delay are Landlord's responsibility.",
    ],
  },
  {
    heading: "Statements and original bills",
    body: [
      "For each bill, Landlord will give Tenant a statement showing the provider, the service period, the bill total, Tenant's days, the rate per day and Tenant's share. Statements may be delivered electronically.",
      "Landlord will make a copy of the original provider bill available to Tenant on request, within [5] days of the request.",
    ],
  },
  {
    heading: "Due date and payment",
    body: [
      "Tenant will pay each share within [14] days after the statement is delivered. Payment may be made by [Venmo / Zelle / Cash App / other method], or another method both parties agree to in writing.",
      "[Optional: A share not paid within [X] days of its due date is treated as [additional rent / subject to the late fee in the Lease], to the extent permitted by law.]",
    ],
  },
  {
    heading: "Moving in and moving out",
    body: [
      "Tenant pays only for days within Tenant's occupancy. Because bills often arrive after the service period ends, Tenant agrees to pay shares for any service period that overlaps Tenant's occupancy, including shares for bills issued after Tenant moves out. Landlord may [deduct unpaid utility shares from the security deposit, as permitted by law / invoice Tenant at Tenant's forwarding address].",
    ],
  },
  {
    heading: "Questions and corrections",
    body: [
      "Tenant may question a share within [30] days of receiving the statement. Landlord will review it and, if a date or amount was wrong, correct the share and credit or charge the difference on the next statement.",
    ],
  },
  {
    heading: "Changes to the method",
    body: [
      "Landlord may change the shared utilities listed or the allocation method only with at least [30] days' written notice to Tenant, and any change applies only to service periods that begin after the notice period ends. A change that increases Tenant's obligations requires Tenant's written agreement where the Lease or law requires it.",
    ],
  },
  {
    heading: "Compliance",
    body: [
      "Landlord and Tenant intend this Addendum to comply with applicable state and local law on utility allocation and submetering. Any provision that conflicts with that law is replaced by the minimum the law requires, and the rest of this Addendum remains in effect.",
    ],
  },
];

const signatureLines = [
  "Landlord: ______________________   Date: __________",
  "Tenant: ________________________   Date: __________",
];

const plainText = [
  title.toUpperCase(),
  "",
  preamble,
  "",
  ...clauses.flatMap((c, i) => [`${i + 1}. ${c.heading}`, ...c.body.map((p) => `   ${p}`), ""]),
  ...signatureLines,
].join("\n");

export default function LeaseAddendumPage() {
  return (
    <ContentPage
      title="Utility allocation lease addendum"
      lede="A starting point for writing the person-days split into your leases. Fill in the bracketed parts, then have it reviewed for your state before you use it."
      notice={
        <DraftNotice>
          This is a template, not a finished legal document. Some states and cities regulate how
          landlords can allocate or bill utilities to tenants. Check the rules where your property is
          before using it.
        </DraftNotice>
      }
    >
      <div className={proseClass}>
        <section aria-labelledby="using">
          <h2 id="using" className="!mt-0">Using this template</h2>
          <ul>
            <li>
              Replace everything in <strong>[square brackets]</strong>, and delete options that
              don&apos;t apply.
            </li>
            <li>Attach it to the lease and have every tenant sign it, including tenants who join mid-lease.</li>
            <li>
              It matches how FairSplit calculates shares, so the statements tenants see line up with
              what they signed. See <Link href="/how-it-works">how the split works</Link> for a
              worked example.
            </li>
            <li>
              Local rules vary: some places limit which utilities can be split, require specific
              disclosures, or restrict fees. A local attorney or landlord association can tell you
              what applies.
            </li>
          </ul>
        </section>
      </div>

      <div className="mt-10 flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold sm:text-3xl">The template</h2>
        <CopyTextButton text={plainText} label="Copy addendum text" copiedLabel="Addendum copied" />
      </div>

      <article
        aria-label={title}
        className="mt-4 max-w-3xl rounded-2xl border bg-card px-5 py-8 sm:px-10 sm:py-12"
      >
        <h3 className="text-center text-xl font-bold sm:text-2xl">{title}</h3>
        <p className="mt-6 leading-relaxed">{preamble}</p>
        <ol className="mt-6 flex flex-col gap-6">
          {clauses.map((c, i) => (
            <li key={c.heading} className="grid gap-2 sm:grid-cols-[2rem_1fr]">
              <span className="figure text-sm text-muted-foreground sm:pt-0.5">{i + 1}.</span>
              <div>
                <h4 className="font-semibold">{c.heading}</h4>
                {c.body.map((p) => (
                  <p key={p} className="mt-2 leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid gap-8 border-t border-dashed pt-8 text-sm text-muted-foreground sm:grid-cols-2">
          {["Landlord", "Tenant"].map((party) => (
            <div key={party} className="flex flex-col gap-6">
              <p className="border-b border-foreground/40 pb-1">{party} signature</p>
              <p className="border-b border-foreground/40 pb-1">Date</p>
            </div>
          ))}
        </div>
      </article>
    </ContentPage>
  );
}

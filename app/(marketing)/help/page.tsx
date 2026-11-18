import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ContentPage, type TocItem } from "../_components/content-page";

export const metadata: Metadata = {
  title: "Help and FAQs — FairSplit",
  description:
    "Answers for landlords and tenants: inviting tenants, signing in with an email link, paying and marking shares paid, questions about a bill, moving out, and who can see which amounts.",
};

interface Faq {
  q: string;
  a: React.ReactNode;
}

interface FaqGroup {
  id: string;
  title: string;
  intro: string;
  items: Faq[];
}

const groups: FaqGroup[] = [
  {
    id: "landlords",
    title: "For landlords",
    intro: "Setting up a house, inviting tenants and keeping track of payments.",
    items: [
      {
        q: "How do I invite a tenant?",
        a: (
          <>
            <p>
              Add the tenant to the property with their name, email and move-in date. FairSplit
              gives you an invite link you can send by email or paste into a text. When the tenant
              opens it, they confirm their email and their account is joined to your house.
            </p>
            <p>
              Invite links stay valid for 30 days. If one expires or gets lost, create a new link
              from the tenant&apos;s row; the old one stops working.
            </p>
          </>
        ),
      },
      {
        q: "Do I have to invite tenants before I can split bills?",
        a: (
          <p>
            No. Bills are split using the move-in and move-out dates on each tenant&apos;s record,
            whether or not they have accepted the invite. Inviting them lets them see their share and
            mark it paid themselves.
          </p>
        ),
      },
      {
        q: "How do tenants pay me?",
        a: (
          <p>
            Directly, with the method you already use. Add your Venmo, Zelle or Cash App details in
            settings and FairSplit shows them next to each tenant&apos;s share. FairSplit never
            holds, moves or touches the money.
          </p>
        ),
      },
      {
        q: "A tenant marked their share paid. What do I do?",
        a: (
          <p>
            Check that the money arrived, then confirm the payment. Until you confirm it, the share
            shows as marked paid but not yet confirmed. If the money never
            arrived, leave it unconfirmed and talk to the tenant.
          </p>
        ),
      },
      {
        q: "What happens when a tenant moves out?",
        a: (
          <>
            <p>
              Set their move-out date. They are charged for every day up to and including that date,
              and for nothing after it. Any open bill whose service period overlaps the change is
              recalculated, and the other tenants&apos; shares adjust to match.
            </p>
          </>
        ),
      },
      {
        q: "Can tenants see what everyone else owes?",
        a: (
          <p>
            You decide, per property. With full transparency, tenants see the whole house&apos;s
            split: every tenant&apos;s days and amount. With own share only, each tenant sees just
            their own share and how it was worked out. You can change this in the property&apos;s settings at any time.
          </p>
        ),
      },
      {
        q: "I entered a bill wrong. Can I fix it?",
        a: (
          <p>
            Yes. Edit the amount or service dates and the split is recalculated. Tenants see the
            updated share. If someone has already paid the old amount, settle the difference with
            them directly.
          </p>
        ),
      },
    ],
  },
  {
    id: "tenants",
    title: "For tenants",
    intro: "FairSplit is always free for tenants. Here is what to expect.",
    items: [
      {
        q: "How do I sign in? I never set a password.",
        a: (
          <p>
            There is no password. Enter your email on the{" "}
            <Link href="/login">sign-in page</Link> and FairSplit emails you a one-time sign-in
            link. Open it and you are signed in. If it doesn&apos;t arrive within a few
            minutes, check your spam folder, then request a new one. Each link works once and expires
            after a short time.
          </p>
        ),
      },
      {
        q: "My invite link says it has expired.",
        a: (
          <p>
            Ask your landlord to send a new one. Invite links last 30 days, and a fresh link replaces
            the old one.
          </p>
        ),
      },
      {
        q: "How was my share worked out?",
        a: (
          <p>
            By person-days: the bill is divided by the total days everyone lived in the house during
            the bill&apos;s service period, and you pay for your own days. Your bill shows your
            days, the rate per day and the bill total. See{" "}
            <Link href="/how-it-works">how the split works</Link> for a full worked example.
          </p>
        ),
      },
      {
        q: "How do I pay, and what does “I’ve paid” do?",
        a: (
          <>
            <p>
              Pay your landlord with the Venmo, Zelle or Cash App details shown on your bill. Then
              tap <strong>I&apos;ve paid</strong> so your landlord knows to look for it.
            </p>
            <p>
              Tapping it doesn&apos;t send any money. Your share shows as paid once your landlord
              confirms they received it.
            </p>
          </>
        ),
      },
      {
        q: "I think my share is wrong. What should I do?",
        a: (
          <>
            <p>
              Start with the dates. Most questions come down to a move-in or move-out date. Your bill
              shows the days you were charged for; if they don&apos;t match when you actually lived
              there, tell your landlord.
            </p>
            <p>
              Your landlord can correct the dates or the bill, and FairSplit recalculates
              everyone&apos;s share.  You can also ask to see the original bill. FairSplit doesn&apos;t decide disputes between tenants and
              landlords; your lease and local rules do.
            </p>
          </>
        ),
      },
      {
        q: "I’m moving out. Do I keep paying?",
        a: (
          <p>
            Only for the days you lived there. Make sure your landlord has your move-out date. Bills
            that cover part of your last month will charge you up to and including that day. Bills
            often arrive weeks after the service period ends, so you may get one last share after you
            leave.
          </p>
        ),
      },
      {
        q: "Can other tenants see how much I owe?",
        a: (
          <p>
            It depends on your landlord&apos;s transparency setting for the house. With full
            transparency, everyone sees each tenant&apos;s days and amount, which makes the split easy
            to check. With own share only, other tenants see just their own line.
          </p>
        ),
      },
      {
        q: "Does FairSplit cost tenants anything?",
        a: <p>No. Tenants never pay for FairSplit, and there is no fee on payments.</p>,
      },
    ],
  },
];

const toc: TocItem[] = groups.map((g) => ({ id: g.id, label: g.title }));

const answerClass =
  "max-w-prose space-y-3 pb-5 text-muted-foreground [&_a]:rounded-sm [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/30 [&_a]:underline-offset-4 hover:[&_a]:decoration-primary [&_strong]:font-semibold [&_strong]:text-foreground";

export default function HelpPage() {
  return (
    <ContentPage
      title="Help"
      lede="Answers to the questions landlords and tenants ask most. Tenants with a question about a specific bill should ask their landlord first: they hold the dates and the original bill."
      toc={toc}
    >
      <div className="flex flex-col gap-16">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={group.id} className="max-w-3xl">
            <h2 id={group.id} className="scroll-mt-24 text-2xl font-bold sm:text-3xl">
              {group.title}
            </h2>
            <p className="mt-2 text-muted-foreground">{group.intro}</p>
            <div className="mt-6 divide-y border-y">
              {group.items.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className={answerClass}>{item.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ContentPage>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, proseClass, type TocItem } from "../_components/content-page";
import { DraftNotice } from "../_components/draft-notice";

export const metadata: Metadata = {
  title: "Privacy policy (draft) — FairSplit",
  description:
    "Draft privacy policy for FairSplit: what we collect, why, who processes it, how long we keep it and how to have it deleted.",
  robots: { index: false },
};

const toc: TocItem[] = [
  { id: "who", label: "Who we are" },
  { id: "collect", label: "What we collect" },
  { id: "use", label: "How we use it" },
  { id: "see", label: "Who can see what" },
  { id: "processors", label: "Services we rely on" },
  { id: "cookies", label: "Cookies" },
  { id: "keep", label: "How long we keep it" },
  { id: "rights", label: "Your choices" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes and contact" },
];

const processors = [
  { name: "Supabase", role: "Database, sign-in and file storage", where: "United States (us-east-1)" },
  { name: "Vercel", role: "Hosting the website and app", where: "United States and global edge network" },
  { name: "Resend", role: "Sending sign-in links, invites and reminders by email", where: "United States" },
  {
    name: "Anthropic",
    role: "Reading uploaded bill PDFs, only when a landlord chooses to import a bill that way",
    where: "United States",
  },
];

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy policy"
      lede="FairSplit stores the minimum it needs to split a utility bill and track who has paid. We don't sell your data, show ads or move your money."
      meta="Draft dated November 18, 2026"
      notice={<DraftNotice>This plain-English draft describes how FairSplit works today. It is not yet in force.</DraftNotice>}
      toc={toc}
    >
      <div className={proseClass}>
        <section aria-labelledby="who">
          <h2 id="who">Who we are</h2>
          <p>
            FairSplit is operated by FairSplit (operator details to be added), referred to here as
            &ldquo;we&rdquo; or &ldquo;us&rdquo;. FairSplit is a tool landlords use to divide shared
            utility bills among the tenants of a house and to track payments that tenants make to the
            landlord directly.
          </p>
          <p>
            For tenant information, the landlord decides what to enter and who to invite. We process
            that information on the landlord&apos;s behalf to provide the service.
          </p>
        </section>

        <section aria-labelledby="collect">
          <h2 id="collect">What we collect</h2>
          <ul>
            <li>
              <strong>Account details:</strong> name, email address and your role (landlord or
              tenant).
            </li>
            <li>
              <strong>Property and tenancy details:</strong> property name and address, which tenants
              live there, and their move-in and move-out dates.
            </li>
            <li>
              <strong>Bills:</strong> provider, amount, service dates, due date and the calculated
              share for each tenant.
            </li>
            <li>
              <strong>Uploaded bill PDFs</strong>, if a landlord chooses to upload them. Bills can
              include an account number and service address.
            </li>
            <li>
              <strong>Payment status:</strong> whether a tenant has marked a share paid and whether
              the landlord confirmed it, with dates. We do not collect card or bank numbers.
            </li>
            <li>
              <strong>Payment handles</strong> a landlord chooses to share, such as a Venmo username,
              Zelle email or phone, or Cash App $cashtag.
            </li>
            <li>
              <strong>Technical data:</strong> sign-in session cookies, and standard server logs (IP
              address, browser type, time of request) kept for security and troubleshooting.
            </li>
          </ul>
        </section>

        <section aria-labelledby="use">
          <h2 id="use">How we use it</h2>
          <ul>
            <li>To split bills by person-days and show each tenant their share and the math.</li>
            <li>To send sign-in links, invites, new-bill notices and payment reminders by email.</li>
            <li>To keep the service secure, prevent abuse and fix problems.</li>
            <li>To bill landlords on paid plans.</li>
            <li>To meet legal obligations.</li>
          </ul>
          <p>
            We do not sell personal information, share it for advertising, or use it to build
            profiles about you.
          </p>
        </section>

        <section aria-labelledby="see">
          <h2 id="see">Who can see what</h2>
          <ul>
            <li>
              <strong>Your landlord</strong> sees everything about the tenancies and bills for their
              properties.
            </li>
            <li>
              <strong>You, as a tenant,</strong> see your own shares and payments, and the bills for
              the house you live in.
            </li>
            <li>
              <strong>Other tenants in your house</strong> may see your name, days and share for each
              bill, depending on the landlord&apos;s transparency setting. With &ldquo;own share
              only&rdquo;, they see just their own line.
            </li>
            <li>
              <strong>Our staff</strong> access account data only to provide support, keep the
              service running or when the law requires it.
            </li>
          </ul>
          <p>
            Access is enforced in the database itself, not just in the app, so one landlord&apos;s
            data is never visible to another.
          </p>
        </section>

        <section aria-labelledby="processors">
          <h2 id="processors">Services we rely on</h2>
          <p>
            We use a small number of service providers to run FairSplit. They process data only on
            our instructions and only to provide their service to us.
          </p>
        </section>
      </div>

      <div className="mt-6 max-w-3xl overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">Service providers that process FairSplit data</caption>
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">Provider</th>
              <th scope="col" className="px-4 py-3 font-medium">What for</th>
              <th scope="col" className="px-4 py-3 font-medium">Where</th>
            </tr>
          </thead>
          <tbody>
            {processors.map((p) => (
              <tr key={p.name} className="border-b border-dashed align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-medium">{p.name}</th>
                <td className="px-4 py-3 text-muted-foreground">{p.role}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={proseClass}>
        <p>
          When a landlord uses PDF import, the bill file is sent to Anthropic&apos;s API to read the
          provider, amount and dates, which the landlord then confirms. If you don&apos;t want a bill
          processed this way, enter it by hand instead. A payment processor will be listed here once
          paid plans launch.
        </p>

        <section aria-labelledby="cookies">
          <h2 id="cookies">Cookies</h2>
          <p>
            We use only the cookies needed to keep you signed in. There are no advertising or
            cross-site tracking cookies.
          </p>
        </section>

        <section aria-labelledby="keep">
          <h2 id="keep">How long we keep it</h2>
          <p>
            We keep account, bill and payment records while the landlord&apos;s account is active,
            because both landlords and tenants rely on that history. When a landlord deletes a
            property or closes their account, we delete or anonymise the related data within 90 days,
            except where we must keep records longer by law. Server logs are kept for a limited
            period, typically no more than 30 days.
          </p>
        </section>

        <section aria-labelledby="rights">
          <h2 id="rights">Your choices</h2>
          <ul>
            <li>See and correct your name and email in your account settings.</li>
            <li>Ask us for a copy of your data, or ask us to delete it.</li>
            <li>
              Tenants: much of your information belongs to your landlord&apos;s records. We may pass
              your request to your landlord, or ask them to update it.
            </li>
            <li>
              Depending on where you live, state privacy laws may give you further rights. We will
              honor them where they apply.
            </li>
          </ul>
          <p>Use the contact details below and we will respond within 30 days.</p>
        </section>

        <section aria-labelledby="security">
          <h2 id="security">Security</h2>
          <p>
            Data is encrypted in transit and at rest by our hosting providers. Sign-in uses one-time
            email links rather than passwords. Uploaded bills are kept in private storage. No system
            is perfectly secure; if a breach affects your data, we will tell you as the law requires.
          </p>
        </section>

        <section aria-labelledby="children">
          <h2 id="children">Children</h2>
          <p>FairSplit is for adults. We don&apos;t knowingly collect data from anyone under 18.</p>
        </section>

        <section aria-labelledby="changes">
          <h2 id="changes">Changes and contact</h2>
          <p>
            If we change this policy in a way that matters, we will email account holders before the
            change takes effect. Questions or requests: contact FairSplit (operator details and
            contact address to be added).
          </p>
          <p>
            See also the <Link href="/terms">terms of service</Link>.
          </p>
        </section>
      </div>
    </ContentPage>
  );
}

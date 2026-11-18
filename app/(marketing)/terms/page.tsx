import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, proseClass, type TocItem } from "../_components/content-page";
import { DraftNotice } from "../_components/draft-notice";

export const metadata: Metadata = {
  title: "Terms of service (draft) — FairSplit",
  description:
    "Draft terms of service for FairSplit, the utility bill splitting tool for landlords and tenants.",
  robots: { index: false },
};

const toc: TocItem[] = [
  { id: "agreement", label: "The agreement" },
  { id: "service", label: "What FairSplit does" },
  { id: "money", label: "FairSplit doesn't handle money" },
  { id: "accounts", label: "Accounts" },
  { id: "landlords", label: "Landlord responsibilities" },
  { id: "tenants", label: "Tenants" },
  { id: "plans", label: "Plans and billing" },
  { id: "content", label: "Your content" },
  { id: "use", label: "Acceptable use" },
  { id: "ending", label: "Ending your account" },
  { id: "disclaimers", label: "Disclaimers and limits" },
  { id: "general", label: "General" },
];

export default function TermsPage() {
  return (
    <ContentPage
      title="Terms of service"
      lede="The rules for using FairSplit, in plain English."
      meta="Draft dated November 18, 2026"
      notice={<DraftNotice>This plain-English draft is not yet in force.</DraftNotice>}
      toc={toc}
    >
      <div className={proseClass}>
        <section aria-labelledby="agreement">
          <h2 id="agreement">The agreement</h2>
          <p>
            These terms are an agreement between you and FairSplit (operator details to be added)
            (&ldquo;FairSplit&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or
            using FairSplit, you agree to them and to our{" "}
            <Link href="/privacy">privacy policy</Link>. If you don&apos;t agree, don&apos;t use the
            service.
          </p>
        </section>

        <section aria-labelledby="service">
          <h2 id="service">What FairSplit does</h2>
          <p>
            FairSplit helps landlords divide shared utility bills among tenants by person-days, shows
            each tenant their share and the calculation, and records whether shares have been paid.
            It is a calculator and record-keeping tool. It is not legal, tax or financial advice, and
            it does not make sure your lease or utility arrangements comply with the law where your
            property is.
          </p>
        </section>

        <section aria-labelledby="money">
          <h2 id="money">FairSplit doesn&apos;t handle money</h2>
          <p>
            Tenants pay landlords directly using services such as Venmo, Zelle or Cash App. FairSplit
            is not a party to those payments, does not hold or transfer funds, and is not responsible
            for payments that are sent, lost, reversed or disputed. Marking a share as paid in
            FairSplit records what a tenant or landlord has told us; it is not proof of payment.
          </p>
        </section>

        <section aria-labelledby="accounts">
          <h2 id="accounts">Accounts</h2>
          <ul>
            <li>You must be at least 18 and able to enter a binding agreement.</li>
            <li>Give accurate information and keep your email address current.</li>
            <li>
              Sign-in links are sent to your email. Keep access to that inbox secure; anyone who can
              read it can sign in as you.
            </li>
            <li>Tell us promptly if you think your account has been used without permission.</li>
          </ul>
        </section>

        <section aria-labelledby="landlords">
          <h2 id="landlords">Landlord responsibilities</h2>
          <ul>
            <li>
              Enter bill amounts, service dates and tenant move dates accurately. Splits are only as
              correct as the information they are based on.
            </li>
            <li>
              Make sure your leases allow you to pass utility costs on to tenants, and that the method
              you use complies with state and local rules. Some states and cities regulate how
              utilities can be allocated or billed.
            </li>
            <li>
              Have the right to share tenants&apos; names, emails and dates with us, and tell your
              tenants you use FairSplit.
            </li>
            <li>Respond to tenants&apos; reasonable questions about their bills.</li>
          </ul>
        </section>

        <section aria-labelledby="tenants">
          <h2 id="tenants">Tenants</h2>
          <p>
            Tenants use FairSplit free of charge. Your obligations to pay utilities come from your
            lease with your landlord, not from these terms. Questions or disagreements about a share
            are between you and your landlord; FairSplit does not decide them.
          </p>
        </section>

        <section aria-labelledby="plans">
          <h2 id="plans">Plans and billing</h2>
          <ul>
            <li>The Free plan covers one property. Features and limits are described on our pricing page.</li>
            <li>
              Pro is billed per property, per month, in advance, at the price shown when you
              subscribe. Prices may change with at least 30 days&apos; notice by email.
            </li>
            <li>
              You can cancel at any time; your plan stays active until the end of the period you have
              paid for. Except where the law requires, payments are not refundable.
            </li>
            <li>Prices don&apos;t include taxes, which may be added where required.</li>
          </ul>
        </section>

        <section aria-labelledby="content">
          <h2 id="content">Your content</h2>
          <p>
            You keep ownership of the information and files you put into FairSplit. You give us
            permission to store, process and display them only as needed to run the service for you,
            including sending uploaded bill PDFs to our service providers when you use PDF import.
            Bill details read from a PDF are suggestions; check them before saving.
          </p>
        </section>

        <section aria-labelledby="use">
          <h2 id="use">Acceptable use</h2>
          <p>Don&apos;t use FairSplit to:</p>
          <ul>
            <li>charge tenants more than the actual cost of a utility in a way your lease or the law doesn&apos;t allow;</li>
            <li>harass anyone, or enter information about people without a legitimate reason;</li>
            <li>upload malware, or try to access data that isn&apos;t yours;</li>
            <li>overload, scrape or reverse engineer the service, or resell it without our permission.</li>
          </ul>
          <p>We may suspend accounts that break these rules, with notice where practical.</p>
        </section>

        <section aria-labelledby="ending">
          <h2 id="ending">Ending your account</h2>
          <p>
            You can stop using FairSplit at any time and ask us to close your account. We may end or
            suspend an account for serious or repeated breaches of these terms, or if we stop
            offering the service; if we stop offering it, we will give at least 30 days&apos; notice
            and a way to export your bill and payment history.
          </p>
        </section>

        <section aria-labelledby="disclaimers">
          <h2 id="disclaimers">Disclaimers and limits</h2>
          <p>
            We work to keep FairSplit accurate and available, but it is provided &ldquo;as is&rdquo;
            and &ldquo;as available&rdquo;, without warranties of any kind, to the extent the law
            allows. We are not liable for indirect or consequential losses, or for amounts owed
            between landlords and tenants. Our total liability for any claim is limited to the
            greater of the amount you paid us in the 12 months before the claim and $50. Some places
            don&apos;t allow these limits, so they may not all apply to you.
          </p>
        </section>

        <section aria-labelledby="general">
          <h2 id="general">General</h2>
          <ul>
            <li>
              We may update these terms. If a change matters, we will email account holders at least
              30 days before it takes effect.
            </li>
            <li>Governing law and dispute resolution: to be added after legal review.</li>
            <li>If part of these terms can&apos;t be enforced, the rest still applies.</li>
            <li>Contact: FairSplit (operator details and contact address to be added).</li>
          </ul>
        </section>
      </div>
    </ContentPage>
  );
}

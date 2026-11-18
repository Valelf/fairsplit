"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildCashAppLink,
  buildPaypalLink,
  buildVenmoLinks,
  hasAnyPaymentMethod,
  normalizeCashtag,
  normalizeVenmoHandle,
  type OwnerPaymentMethods,
} from "@/lib/payments";

type Methods = Pick<
  OwnerPaymentMethods,
  "venmo_handle" | "cashapp_handle" | "zelle_contact" | "paypal_me" | "instructions"
>;

interface PaymentMethodLinksProps {
  methods: Methods | null;
  amountCents: number;
  note: string;
  /** Message when the owner hasn't added any handles yet. */
  emptyMessage?: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard can be blocked; the value is visible on screen anyway.
        }
      }}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function MethodRow({ name, detail, children }: { name: string; detail: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </li>
  );
}

/** The owner's payment handles as tappable, prefilled links. Shared by the tenant panel and the owner preview. */
export function PaymentMethodLinks({
  methods,
  amountCents,
  note,
  emptyMessage = "Your landlord hasn't added payment details yet. Ask them how they'd like to be paid.",
}: PaymentMethodLinksProps) {
  if (!methods || !hasAnyPaymentMethod(methods)) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const venmo = methods.venmo_handle ? buildVenmoLinks(methods.venmo_handle, amountCents, note) : null;
  const cashApp = methods.cashapp_handle ? buildCashAppLink(methods.cashapp_handle, amountCents) : null;
  const paypal = methods.paypal_me ? buildPaypalLink(methods.paypal_me, amountCents) : null;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {venmo && (
          <MethodRow name="Venmo" detail={`@${normalizeVenmoHandle(methods.venmo_handle)}`}>
            <Button asChild size="sm">
              <a href={venmo.app}>Open Venmo</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={venmo.web} target="_blank" rel="noopener noreferrer">
                Web
                <ExternalLink className="ml-2 h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          </MethodRow>
        )}
        {cashApp && (
          <MethodRow name="Cash App" detail={`$${normalizeCashtag(methods.cashapp_handle)}`}>
            <Button asChild size="sm">
              <a href={cashApp} target="_blank" rel="noopener noreferrer">
                Open Cash App
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          </MethodRow>
        )}
        {methods.zelle_contact && (
          <MethodRow name="Zelle" detail={methods.zelle_contact}>
            <CopyButton value={methods.zelle_contact} label="Zelle contact" />
          </MethodRow>
        )}
        {paypal && (
          <MethodRow name="PayPal" detail={paypal.replace(/^https:\/\//, "").replace(/\/[^/]+$/, "")}>
            <Button asChild size="sm">
              <a href={paypal} target="_blank" rel="noopener noreferrer">
                Open PayPal
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          </MethodRow>
        )}
      </ul>
      {methods.instructions && (
        <p className="whitespace-pre-line rounded-lg bg-muted p-3 text-sm">{methods.instructions}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Payments go straight to your landlord. FairSplit never handles money. Include the note
        &ldquo;{note}&rdquo; so they know what it&apos;s for.
      </p>
    </div>
  );
}

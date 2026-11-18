"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentMethodLinks } from "@/components/shared/payment-method-links";
import { savePaymentMethods } from "@/lib/actions/payment-methods";
import { formatCents } from "@/lib/utils";

type Values = {
  payee_name: string;
  venmo_handle: string;
  cashapp_handle: string;
  zelle_contact: string;
  paypal_me: string;
  instructions: string;
};

const FIELDS: { key: Exclude<keyof Values, "instructions">; label: string; placeholder: string; hint?: string }[] = [
  { key: "payee_name", label: "Name tenants should pay", placeholder: "Shekar R." },
  { key: "venmo_handle", label: "Venmo username", placeholder: "@your-venmo", hint: "Without the @ is fine too." },
  { key: "cashapp_handle", label: "Cash App $cashtag", placeholder: "$yourtag" },
  { key: "zelle_contact", label: "Zelle email or phone", placeholder: "you@example.com" },
  { key: "paypal_me", label: "PayPal.me name", placeholder: "yourname" },
];

const PREVIEW_AMOUNT_CENTS = 12345;
const PREVIEW_NOTE = "FairSplit · Your property · Dec 2026";

interface PaymentMethodsFormProps {
  initial: Partial<Record<keyof Values, string | null>> | null;
}

export function PaymentMethodsForm({ initial }: PaymentMethodsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    payee_name: initial?.payee_name ?? "",
    venmo_handle: initial?.venmo_handle ?? "",
    cashapp_handle: initial?.cashapp_handle ?? "",
    zelle_contact: initial?.zelle_contact ?? "",
    paypal_me: initial?.paypal_me ?? "",
    instructions: initial?.instructions ?? "",
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: e.target.value }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Payment details</CardTitle>
          <CardDescription>
            Tenants see these on each bill with a one-tap link that fills in the amount. FairSplit never
            touches the money.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await savePaymentMethods(values);
                if ("error" in result) setError(result.error ?? "Could not save");
                else {
                  setSaved(true);
                  router.refresh();
                }
              });
            }}
          >
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`pm-${f.key}`}>{f.label}</Label>
                <Input
                  id={`pm-${f.key}`}
                  value={values[f.key]}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  maxLength={f.key === "zelle_contact" || f.key === "payee_name" ? 100 : 50}
                  autoComplete="off"
                  aria-describedby={f.hint ? `pm-${f.key}-hint` : undefined}
                />
                {f.hint && (
                  <p id={`pm-${f.key}-hint`} className="text-xs text-muted-foreground">
                    {f.hint}
                  </p>
                )}
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="pm-instructions">Other instructions</Label>
              <textarea
                id="pm-instructions"
                value={values.instructions}
                onChange={set("instructions")}
                maxLength={500}
                rows={3}
                placeholder="e.g. Please pay by the 5th. Cash is fine too."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : saved ? (
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              ) : null}
              {saved ? "Saved" : "Save payment details"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What tenants see</CardTitle>
          <CardDescription>
            Preview for a {formatCents(PREVIEW_AMOUNT_CENTS)} share
            {values.payee_name ? `, paid to ${values.payee_name}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentMethodLinks
            methods={{
              venmo_handle: values.venmo_handle || null,
              cashapp_handle: values.cashapp_handle || null,
              zelle_contact: values.zelle_contact || null,
              paypal_me: values.paypal_me || null,
              instructions: values.instructions || null,
            }}
            amountCents={PREVIEW_AMOUNT_CENTS}
            note={PREVIEW_NOTE}
            emptyMessage="Add at least one way to pay. Until then, tenants are told to ask you how to pay."
          />
        </CardContent>
      </Card>
    </div>
  );
}

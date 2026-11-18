"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Sparkles, Info, Plug } from "lucide-react";
import { createBill } from "@/lib/actions/bills";
import type { BillCategory } from "@/lib/supabase/types";
import { BILL_CATEGORY_OPTIONS, billCategoryLabel, isBillCategory } from "@/lib/utilities/categories";
import { suggestBill, type PreviousBill } from "@/lib/utilities/suggest";
import { centsToInput, dollarsToCents } from "@/lib/owner/money";
import { formatCents, formatDateRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfUploadZone } from "@/components/shared/pdf-upload-zone";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import {
  DEFAULT_SPLIT_RULES,
  SplitRulesField,
  splitRulesToInput,
  type SplitRuleTenant,
  type SplitRulesValue,
} from "@/components/owner/split-rules-field";

type ConfidenceLevel = "high" | "medium" | "low";
type FieldConfidence = Record<string, ConfidenceLevel>;

export type NewBillAccount = {
  id: string;
  category: BillCategory;
  provider: string;
  account_number_last4: string | null;
  typical_amount_cents: number | null;
  lastBill: PreviousBill | null;
};

interface NewBillFormProps {
  propertyId: string;
  cycleId: string;
  cycle?: { start_date: string | null; end_date: string | null } | null;
  accounts?: NewBillAccount[];
  initialAccountId?: string | null;
  /** Property tenants, for the split-rule controls and preview. */
  tenants?: SplitRuleTenant[];
}

const NO_ACCOUNT = "none";

type Fields = {
  category: BillCategory;
  provider: string;
  amount: string;
  service_start: string;
  service_end: string;
};

function fieldsFromAccount(
  account: NewBillAccount | undefined,
  cycle: NewBillFormProps["cycle"]
): { fields: Fields; hint: string | null } {
  if (!account) {
    return {
      fields: { category: "internet", provider: "", amount: "", service_start: "", service_end: "" },
      hint: null,
    };
  }
  const s = suggestBill(account, account.lastBill, cycle);
  const hints: string[] = [];
  if (s.datesSource === "continued") hints.push("dates continue from the last bill");
  if (s.datesSource === "cycle") hints.push("dates from this cycle");
  if (s.amountSource === "last") hints.push("amount from the last bill");
  if (s.amountSource === "typical") hints.push("typical amount");
  return {
    fields: {
      category: isBillCategory(s.category) ? s.category : "other",
      provider: s.provider,
      amount: s.amount_cents ? centsToInput(s.amount_cents) : "",
      service_start: s.service_start,
      service_end: s.service_end,
    },
    hint: hints.length ? `Pre-filled: ${hints.join(", ")}. Check against the actual bill.` : null,
  };
}

/** Add-bill form. Picking a utility account pre-fills every field; all stay editable. */
export function NewBillForm({
  propertyId,
  cycleId,
  cycle = null,
  accounts = [],
  initialAccountId = null,
  tenants = [],
}: NewBillFormProps) {
  const [splitRules, setSplitRules] = useState<SplitRulesValue>(DEFAULT_SPLIT_RULES);
  const router = useRouter();
  const initialAccount = accounts.find((a) => a.id === initialAccountId);
  const [accountId, setAccountId] = useState<string>(initialAccount?.id ?? NO_ACCOUNT);
  const [initial] = useState(() => fieldsFromAccount(initialAccount, cycle));
  const [fields, setFields] = useState<Fields>(initial.fields);
  const [prefillHint, setPrefillHint] = useState<string | null>(initial.hint);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<FieldConfidence>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const cycleHref = `/dashboard/owner/properties/${propertyId}/cycles/${cycleId}`;

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function pickAccount(id: string) {
    setAccountId(id);
    if (id === NO_ACCOUNT) {
      setPrefillHint(null);
      return;
    }
    const next = fieldsFromAccount(
      accounts.find((a) => a.id === id),
      cycle
    );
    setFields(next.fields);
    setPrefillHint(next.hint);
    setConfidence({});
  }

  async function handleParsePdf() {
    if (!pdfFile) return;

    setParsing(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("property_id", propertyId);

      const res = await fetch("/api/bills/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.fallback) {
        setParseError(result.message || "PDF parsing not configured. Enter details manually.");
        return;
      }

      if (result.error) {
        setParseError(result.error);
        return;
      }

      const data = result.data;
      if (data.confidence) setConfidence(data.confidence);
      setFields((f) => ({
        category: isBillCategory(data.category) ? data.category : f.category,
        provider: data.provider || f.provider,
        amount: typeof data.amount === "number" ? data.amount.toFixed(2) : f.amount,
        service_start: data.service_start || f.service_start,
        service_end: data.service_end || f.service_end,
      }));
    } catch {
      setParseError("Failed to parse PDF. Enter details manually.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amountCents = dollarsToCents(fields.amount);
    if (amountCents === null || amountCents <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    const result = await createBill({
      cycle_id: cycleId,
      property_id: propertyId,
      category: fields.category,
      provider: fields.provider,
      amount_cents: amountCents,
      service_start: fields.service_start,
      service_end: fields.service_end,
      source: pdfPath ? "pdf_parsed" : "manual",
      pdf_storage_path: pdfPath || undefined,
      notes: notes || undefined,
      utility_account_id: selectedAccount?.id ?? null,
      ...splitRulesToInput(splitRules),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(cycleHref);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={cycleHref} aria-label="Back to cycle">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Bill</h1>
          <p className="text-muted-foreground">Enter the bill details to calculate splits</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bill Details</CardTitle>
          <CardDescription>
            All amounts are in dollars. Splits will be calculated automatically based on tenant
            occupancy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="utility_account" className="flex items-center gap-2">
                <Plug className="h-3 w-3" aria-hidden="true" />
                Utility account
              </Label>
              {accounts.length > 0 ? (
                <Select value={accountId} onValueChange={pickAccount}>
                  <SelectTrigger id="utility_account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ACCOUNT}>No account (enter manually)</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.provider} · {billCategoryLabel(a.category)}
                        {a.account_number_last4 ? ` · ••••${a.account_number_last4}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No utility accounts yet.{" "}
                  <Link
                    href={`/dashboard/owner/properties/${propertyId}/overview`}
                    className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Set them up on the property page
                  </Link>{" "}
                  so bills pre-fill next time.
                </p>
              )}
              {selectedAccount?.lastBill && (
                <p className="text-xs text-muted-foreground">
                  Last bill: {formatCents(selectedAccount.lastBill.amount_cents)} for{" "}
                  {formatDateRange(
                    selectedAccount.lastBill.service_start,
                    selectedAccount.lastBill.service_end
                  )}
                </p>
              )}
              {prefillHint && (
                <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">{prefillHint}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>PDF Bill (Optional)</Label>
              <PdfUploadZone
                propertyId={propertyId}
                onUploadComplete={(path) => setPdfPath(path)}
                onRemove={() => {
                  setPdfPath(null);
                  setPdfFile(null);
                  setConfidence({});
                  setParseError(null);
                }}
                currentPath={pdfPath}
                onFileSelected={(file) => setPdfFile(file)}
              />
              {pdfPath && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleParsePdf}
                  disabled={parsing || !pdfFile}
                  className="mt-2"
                >
                  {parsing ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3 w-3" />
                  )}
                  {parsing ? "Parsing..." : "Parse Bill with AI"}
                </Button>
              )}
              {parseError && (
                <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{parseError}</p>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="category">Category</Label>
                  {confidence.category && <ConfidenceBadge level={confidence.category} />}
                </div>
                <Select value={fields.category} onValueChange={(v) => set("category", v as BillCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  {confidence.provider && <ConfidenceBadge level={confidence.provider} />}
                </div>
                <Input
                  id="provider"
                  name="provider"
                  placeholder="e.g. Spectrum"
                  value={fields.provider}
                  onChange={(e) => set("provider", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="amount">Amount ($)</Label>
                {confidence.amount && <ConfidenceBadge level={confidence.amount} />}
              </div>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="95.49"
                value={fields.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="service_start">Service Start</Label>
                  {confidence.service_start && <ConfidenceBadge level={confidence.service_start} />}
                </div>
                <Input
                  id="service_start"
                  name="service_start"
                  type="date"
                  value={fields.service_start}
                  onChange={(e) => set("service_start", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="service_end">Service End</Label>
                  {confidence.service_end && <ConfidenceBadge level={confidence.service_end} />}
                </div>
                <Input
                  id="service_end"
                  name="service_end"
                  type="date"
                  value={fields.service_end}
                  min={fields.service_start || undefined}
                  onChange={(e) => set("service_end", e.target.value)}
                  required
                />
              </div>
            </div>

            <SplitRulesField
              tenants={tenants}
              value={splitRules}
              onChange={setSplitRules}
              amountCents={dollarsToCents(fields.amount)}
              serviceStart={fields.service_start}
              serviceEnd={fields.service_end}
            />

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Any additional notes about this bill"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Bill
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href={cycleHref}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

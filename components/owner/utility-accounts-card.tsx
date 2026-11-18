"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Plug, Plus } from "lucide-react";
import {
  createUtilityAccount,
  setUtilityAccountActive,
  updateUtilityAccount,
} from "@/lib/actions/utility-accounts";
import type { BillCategory } from "@/lib/supabase/types";
import { BILL_CATEGORY_OPTIONS, billCategoryLabel } from "@/lib/utilities/categories";
import { centsToInput, dollarsToCents } from "@/lib/owner/money";
import { formatCents, formatDateRange } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export type UtilityAccountRow = {
  id: string;
  category: BillCategory;
  provider: string;
  account_number_last4: string | null;
  typical_amount_cents: number | null;
  billing_day: number | null;
  active: boolean;
  lastBill: { amount_cents: number; service_start: string; service_end: string } | null;
};

interface UtilityAccountsCardProps {
  propertyId: string;
  accounts: UtilityAccountRow[];
  /** Open cycle to link "Add bill" to, if any. */
  openCycleId?: string | null;
  title?: string;
  description?: string;
}

type FormState = {
  category: BillCategory;
  provider: string;
  accountNumber: string;
  typical: string;
  billingDay: string;
};

const EMPTY_FORM: FormState = {
  category: "electricity",
  provider: "",
  accountNumber: "",
  typical: "",
  billingDay: "",
};

/** Property overview card: the house's utility accounts, set up once and used to pre-fill bills. */
export function UtilityAccountsCard({
  propertyId,
  accounts,
  openCycleId = null,
  title = "Utility accounts",
  description = "Set up each utility once. New bills pre-fill from the account and its last bill.",
}: UtilityAccountsCardProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | { mode: "add" } | { mode: "edit"; id: string }>(null);
  const [archiveTarget, setArchiveTarget] = useState<UtilityAccountRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingLast4, setEditingLast4] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const active = accounts.filter((a) => a.active);
  const archived = accounts.filter((a) => !a.active);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingLast4(null);
    setDialog({ mode: "add" });
  }

  function openEdit(a: UtilityAccountRow) {
    setForm({
      category: a.category,
      provider: a.provider,
      accountNumber: "",
      typical: a.typical_amount_cents ? centsToInput(a.typical_amount_cents) : "",
      billingDay: a.billing_day ? String(a.billing_day) : "",
    });
    setEditingLast4(a.account_number_last4);
    setDialog({ mode: "edit", id: a.id });
  }

  async function save(): Promise<string | void> {
    let typical: number | null = null;
    if (form.typical.trim()) {
      typical = dollarsToCents(form.typical);
      if (typical === null || typical <= 0) return "Enter a typical amount like 95.49, or leave it blank";
    }
    let billingDay: number | null = null;
    if (form.billingDay.trim()) {
      billingDay = Number(form.billingDay);
      if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) {
        return "Billing day must be between 1 and 31";
      }
    }
    const input = {
      category: form.category,
      provider: form.provider,
      // In edit mode a blank field keeps the stored last 4.
      account_number:
        dialog?.mode === "edit" && !form.accountNumber.trim() ? undefined : form.accountNumber,
      typical_amount_cents: typical,
      billing_day: billingDay,
    };
    const result =
      dialog?.mode === "edit"
        ? await updateUtilityAccount(dialog.id, input)
        : await createUtilityAccount(propertyId, input);
    if (result.error) return result.error;
    router.refresh();
  }

  async function restore(id: string) {
    setRestoreError(null);
    const result = await setUtilityAccountActive(id, true);
    if (result.error) setRestoreError(result.error);
    else router.refresh();
  }

  const newBillHref = (accountId: string) =>
    openCycleId
      ? `/dashboard/owner/properties/${propertyId}/bills/new?cycleId=${openCycleId}&accountId=${accountId}`
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Plug className="h-4 w-4 text-primary" aria-hidden="true" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add account
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No utility accounts yet. Add electricity, water, internet and the rest so each
            month&apos;s bills pre-fill.
          </p>
        )}

        {active.length > 0 && (
          <ul className="space-y-2">
            {active.map((a) => {
              const href = newBillHref(a.id);
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {a.provider}
                      <Badge variant="secondary">{billCategoryLabel(a.category)}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.account_number_last4 ? `Acct ••••${a.account_number_last4}` : "No account number"}
                      {a.typical_amount_cents ? ` · typically ${formatCents(a.typical_amount_cents)}` : ""}
                      {a.billing_day ? ` · bills around day ${a.billing_day}` : ""}
                    </p>
                    {a.lastBill && (
                      <p className="text-xs text-muted-foreground">
                        Last bill {formatCents(a.lastBill.amount_cents)} for{" "}
                        {formatDateRange(a.lastBill.service_start, a.lastBill.service_end)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {href && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={href}>Add bill</Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(a)}
                      aria-label={`Edit ${a.provider} account`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setArchiveTarget(a)}
                      aria-label={`Archive ${a.provider} account`}
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {archived.length > 0 && (
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {archived.length} archived account{archived.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-2 space-y-2">
              {archived.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {a.provider} · {billCategoryLabel(a.category)}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => restore(a.id)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden="true" />
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
            {restoreError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {restoreError}
              </p>
            )}
          </details>
        )}
      </CardContent>

      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
        title={dialog?.mode === "edit" ? "Edit utility account" : "Add utility account"}
        description="Only the last 4 characters of the account number are saved."
        confirmLabel={dialog?.mode === "edit" ? "Save" : "Add account"}
        confirmDisabled={!form.provider.trim()}
        onConfirm={save}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ua-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as BillCategory }))}
              >
                <SelectTrigger id="ua-category">
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
              <Label htmlFor="ua-provider">Provider</Label>
              <Input
                id="ua-provider"
                value={form.provider}
                placeholder="e.g. CoServ"
                maxLength={120}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ua-account">Account number (optional)</Label>
            <Input
              id="ua-account"
              value={form.accountNumber}
              autoComplete="off"
              maxLength={64}
              placeholder={editingLast4 ? `Saved: ••••${editingLast4} (leave blank to keep)` : "Last 4 digits are enough"}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">We keep only the last 4 characters.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ua-typical">Typical amount ($, optional)</Label>
              <Input
                id="ua-typical"
                inputMode="decimal"
                value={form.typical}
                placeholder="95.49"
                onChange={(e) => setForm((f) => ({ ...f, typical: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ua-day">Billing day (optional)</Label>
              <Input
                id="ua-day"
                type="number"
                min={1}
                max={31}
                value={form.billingDay}
                placeholder="15"
                onChange={(e) => setForm((f) => ({ ...f, billingDay: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => {
          if (!o) setArchiveTarget(null);
        }}
        title="Archive this account?"
        description={
          archiveTarget
            ? `${archiveTarget.provider} stops showing up when you add bills. Existing bills are kept, and you can restore it later.`
            : undefined
        }
        confirmLabel="Archive"
        onConfirm={async () => {
          if (!archiveTarget) return;
          const result = await setUtilityAccountActive(archiveTarget.id, false);
          if (result.error) return result.error;
          router.refresh();
        }}
      />
    </Card>
  );
}

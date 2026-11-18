"use client";

import { useId, useMemo } from "react";
import { calculateBillSplitCents, sortTenantPeriods, type SplitMethod } from "@/lib/calculations/person-days";
import { formatCents } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SplitRuleTenant = {
  id: string;
  display_name: string;
  join_date: string;
  leave_date: string | null;
};

export type SplitRulesValue = {
  method: SplitMethod;
  /** property_tenant_id → reason ("" when none given) */
  exclusions: Record<string, string>;
};

export const DEFAULT_SPLIT_RULES: SplitRulesValue = { method: "person_days", exclusions: {} };

/** Shape the server actions expect. */
export function splitRulesToInput(v: SplitRulesValue) {
  return {
    split_method: v.method,
    exclusions: Object.entries(v.exclusions).map(([property_tenant_id, reason]) => ({
      property_tenant_id,
      reason: reason.trim() || null,
    })),
  };
}

const METHODS: { value: SplitMethod; label: string; hint: string }[] = [
  { value: "person_days", label: "By days lived", hint: "Each person pays for the days they lived here." },
  {
    value: "equal_present",
    label: "Equally among people who lived there",
    hint: "Everyone with at least one day in the service period pays the same share.",
  },
];

interface SplitRulesFieldProps {
  tenants: SplitRuleTenant[];
  value: SplitRulesValue;
  onChange: (v: SplitRulesValue) => void;
  /** Bill amount in cents (null while the amount is invalid/empty). */
  amountCents: number | null;
  serviceStart: string;
  serviceEnd: string;
}

/** "How to split" + "Exclude" controls for a bill, with a live preview of the resulting shares. */
export function SplitRulesField({ tenants, value, onChange, amountCents, serviceStart, serviceEnd }: SplitRulesFieldProps) {
  const uid = useId();
  const datesValid = /^\d{4}-\d{2}-\d{2}$/.test(serviceStart) && /^\d{4}-\d{2}-\d{2}$/.test(serviceEnd) && serviceStart <= serviceEnd;

  const preview = useMemo(() => {
    if (!datesValid || amountCents === null || amountCents <= 0 || tenants.length === 0) return null;
    return calculateBillSplitCents(
      { amountCents, serviceStart, serviceEnd },
      sortTenantPeriods(tenants.map((t) => ({ tenantId: t.id, joinDate: t.join_date, leaveDate: t.leave_date }))),
      { method: value.method, excludedTenantIds: Object.keys(value.exclusions) }
    );
  }, [datesValid, amountCents, serviceStart, serviceEnd, tenants, value]);

  const names = new Map(tenants.map((t) => [t.id, t.display_name]));
  const sharers = preview?.filter((r) => r.personDays > 0) ?? [];

  function toggle(id: string, on: boolean) {
    const next = { ...value.exclusions };
    if (on) next[id] = next[id] ?? "";
    else delete next[id];
    onChange({ ...value, exclusions: next });
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">How to split</legend>
        {METHODS.map((m) => (
          <label key={m.value} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50">
            <input
              type="radio"
              name={`${uid}-method`}
              value={m.value}
              checked={value.method === m.value}
              onChange={() => onChange({ ...value, method: m.value })}
              className="mt-1 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              <span className="block text-sm">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {tenants.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Exclude from this bill</legend>
          <p className="text-xs text-muted-foreground">
            Leave someone out (e.g. they have their own internet plan). Their share goes to everyone else.
          </p>
          <ul className="space-y-2">
            {tenants.map((t) => {
              const excluded = t.id in value.exclusions;
              const boxId = `${uid}-ex-${t.id}`;
              return (
                <li key={t.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      id={boxId}
                      type="checkbox"
                      checked={excluded}
                      onChange={(e) => toggle(t.id, e.target.checked)}
                      className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Label htmlFor={boxId} className="font-normal">
                      {t.display_name}
                    </Label>
                  </div>
                  {excluded && (
                    <div className="pl-7">
                      <Label htmlFor={`${boxId}-reason`} className="sr-only">
                        Reason for excluding {t.display_name}
                      </Label>
                      <Input
                        id={`${boxId}-reason`}
                        placeholder="Reason (optional, shown to tenants)"
                        maxLength={200}
                        value={value.exclusions[t.id]}
                        onChange={(e) =>
                          onChange({ ...value, exclusions: { ...value.exclusions, [t.id]: e.target.value } })
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <div className="space-y-2" aria-live="polite">
        <p className="text-sm font-medium">Preview</p>
        {preview === null ? (
          <p className="text-xs text-muted-foreground">Enter the amount and service dates to preview the shares.</p>
        ) : sharers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nobody shares this bill with these settings.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {sharers.map((r) => (
              <li key={r.tenantId} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">{names.get(r.tenantId) ?? "Tenant"}</span>
                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {value.method === "equal_present"
                      ? `1 of ${r.shareCount} shares`
                      : `${r.personDays} of ${r.totalPersonDays} days`}
                  </span>
                  <span className="font-medium tabular-nums">{formatCents(r.amountCents)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

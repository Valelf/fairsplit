import "server-only";

import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl, deliverEmail, type DeliveryResult } from "@/lib/email/deliver";
import { CycleBillEmail, cycleBillSubject } from "@/lib/email/templates/cycle-bill";
import { OwnerDigestEmail, ownerDigestSubject, type OwnerDigestItem } from "@/lib/email/templates/owner-digest";
import type { PaymentHandles } from "@/lib/email/templates/layout";
import {
  planReminders,
  selectDigestItems,
  toUTCDateString,
  type NotificationKind,
  type ReminderCandidate,
  type ShareLineInput,
  type TenantNotificationKind,
} from "@/lib/notifications/schedule";
import type { CycleStatus } from "@/lib/supabase/types";

type Admin = ReturnType<typeof createAdminClient>;

export interface SendSummary {
  sent: number;
  skipped: number;
  failed: number;
  alreadySent: number;
}

const emptySummary = (): SendSummary => ({ sent: 0, skipped: 0, failed: 0, alreadySent: 0 });

function tally(summary: SendSummary, outcome: DeliveryResult["status"] | "duplicate") {
  if (outcome === "duplicate") summary.alreadySent++;
  else summary[outcome]++;
}

// ------------------------------------------------------------------
// Data loading
// ------------------------------------------------------------------

interface TenantShare {
  propertyTenantId: string;
  profileId: string | null;
  displayName: string;
  email: string | null;
  status: string;
  remindersEnabled: boolean;
  lines: ShareLineInput[];
  totalCents: number;
  owedCents: number;
}

interface CycleContext {
  cycleId: string;
  propertyId: string;
  propertyName: string;
  ownerId: string;
  label: string;
  status: CycleStatus;
  dueDate: string | null;
  handles: PaymentHandles | null;
  tenants: TenantShare[];
}

async function loadCycleContexts(admin: Admin, cycleIds: string[]): Promise<CycleContext[]> {
  if (cycleIds.length === 0) return [];

  const { data: cycles, error: cycleError } = await admin
    .from("billing_cycles")
    .select("id, property_id, label, status, due_date, properties!inner(name, owner_id, deleted_at)")
    .in("id", cycleIds);
  if (cycleError) throw new Error(cycleError.message);

  const live = (cycles ?? []).filter((c) => {
    const p = c.properties as unknown as { deleted_at: string | null } | null;
    return p && !p.deleted_at;
  });
  if (live.length === 0) return [];

  const { data: bills, error: billError } = await admin
    .from("bills")
    .select("id, cycle_id, category, provider, amount_cents")
    .in(
      "cycle_id",
      live.map((c) => c.id)
    );
  if (billError) throw new Error(billError.message);
  const billById = new Map((bills ?? []).map((b) => [b.id, b]));

  const { data: splits, error: splitError } =
    billById.size > 0
      ? await admin
          .from("bill_splits")
          .select("bill_id, tenant_id, person_days, total_person_days, amount_cents, payment_status")
          .in("bill_id", Array.from(billById.keys()))
      : { data: [], error: null };
  if (splitError) throw new Error(splitError.message);

  const tenantIds = Array.from(new Set((splits ?? []).map((s) => s.tenant_id)));
  const { data: tenants } =
    tenantIds.length > 0
      ? await admin
          .from("property_tenants")
          .select("id, tenant_id, display_name, email, status")
          .in("id", tenantIds)
      : { data: [] };
  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));

  const profileIds = Array.from(
    new Set((tenants ?? []).map((t) => t.tenant_id).filter((id): id is string => !!id))
  );
  const { data: profiles } =
    profileIds.length > 0
      ? await admin.from("profiles").select("id, email, full_name, email_reminders").in("id", profileIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const ownerIds = Array.from(
    new Set(live.map((c) => (c.properties as unknown as { owner_id: string }).owner_id))
  );
  const { data: methods } = await admin.from("owner_payment_methods").select("*").in("owner_id", ownerIds);
  const methodsByOwner = new Map((methods ?? []).map((m) => [m.owner_id, m]));

  return live.map((c) => {
    const prop = c.properties as unknown as { name: string; owner_id: string };
    const byTenant = new Map<string, TenantShare>();
    for (const s of splits ?? []) {
      const bill = billById.get(s.bill_id);
      if (!bill || bill.cycle_id !== c.id) continue;
      const pt = tenantById.get(s.tenant_id);
      if (!pt) continue;
      const profile = pt.tenant_id ? profileById.get(pt.tenant_id) : undefined;
      let share = byTenant.get(pt.id);
      if (!share) {
        share = {
          propertyTenantId: pt.id,
          profileId: pt.tenant_id,
          displayName: pt.display_name,
          email: profile?.email ?? pt.email ?? null,
          status: pt.status,
          remindersEnabled: profile?.email_reminders ?? true,
          lines: [],
          totalCents: 0,
          owedCents: 0,
        };
        byTenant.set(pt.id, share);
      }
      share.lines.push({
        category: bill.category,
        provider: bill.provider,
        billAmountCents: bill.amount_cents,
        personDays: s.person_days,
        totalPersonDays: s.total_person_days,
        shareCents: s.amount_cents,
      });
      share.totalCents += s.amount_cents;
      if ((s.payment_status ?? "owed") === "owed") share.owedCents += s.amount_cents;
    }
    for (const share of Array.from(byTenant.values())) {
      share.lines.sort((a, b) => a.category.localeCompare(b.category));
    }
    return {
      cycleId: c.id,
      propertyId: c.property_id,
      propertyName: prop.name,
      ownerId: prop.owner_id,
      label: c.label,
      status: c.status as CycleStatus,
      dueDate: c.due_date ?? null,
      handles: methodsByOwner.get(prop.owner_id) ?? null,
      tenants: Array.from(byTenant.values()).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    };
  });
}

// ------------------------------------------------------------------
// Idempotent send: claim a row first (unique index), then deliver, then record the outcome.
// ------------------------------------------------------------------

async function claimAndSend(
  admin: Admin,
  claim: {
    kind: NotificationKind;
    cycleId?: string;
    propertyId?: string;
    propertyTenantId?: string;
    recipientId?: string | null;
    recipientEmail: string;
    digestDate?: string;
  },
  send: () => Promise<DeliveryResult>
): Promise<DeliveryResult["status"] | "duplicate"> {
  // Failed attempts don't count as sent: clear them so this run can retry.
  if (claim.kind === "owner_digest") {
    await admin
      .from("cycle_notifications")
      .delete()
      .eq("kind", "owner_digest")
      .eq("recipient_id", claim.recipientId!)
      .eq("digest_date", claim.digestDate!)
      .eq("status", "failed");
  } else {
    await admin
      .from("cycle_notifications")
      .delete()
      .eq("kind", claim.kind)
      .eq("cycle_id", claim.cycleId!)
      .eq("property_tenant_id", claim.propertyTenantId!)
      .eq("status", "failed");
  }

  const { data: row, error } = await admin
    .from("cycle_notifications")
    .insert({
      kind: claim.kind,
      cycle_id: claim.cycleId ?? null,
      property_id: claim.propertyId ?? null,
      property_tenant_id: claim.propertyTenantId ?? null,
      recipient_id: claim.recipientId ?? null,
      recipient_email: claim.recipientEmail,
      digest_date: claim.digestDate ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(error.message);
  }

  let result: DeliveryResult;
  try {
    result = await send();
  } catch (err) {
    result = { status: "failed", providerId: null, error: err instanceof Error ? err.message : String(err) };
  }
  await admin
    .from("cycle_notifications")
    .update({
      status: result.status,
      provider_id: result.providerId,
      error: result.error,
      sent_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  return result.status;
}

function tenantCycleUrl(ctx: CycleContext) {
  return `${appUrl()}/dashboard/tenant/properties/${ctx.propertyId}/bills/${ctx.cycleId}`;
}

async function sendTenantCycleEmail(
  admin: Admin,
  ctx: CycleContext,
  tenant: TenantShare,
  kind: TenantNotificationKind
) {
  const amountDueCents = kind === "cycle_ready" ? tenant.totalCents : tenant.owedCents;
  const props = {
    kind,
    tenantName: tenant.displayName,
    propertyName: ctx.propertyName,
    cycleLabel: ctx.label,
    dueDate: ctx.dueDate,
    lines: tenant.lines,
    amountDueCents,
    handles: ctx.handles,
    cycleUrl: tenantCycleUrl(ctx),
  };
  return claimAndSend(
    admin,
    {
      kind,
      cycleId: ctx.cycleId,
      propertyId: ctx.propertyId,
      propertyTenantId: tenant.propertyTenantId,
      recipientId: tenant.profileId,
      recipientEmail: tenant.email!,
    },
    () =>
      deliverEmail({
        to: tenant.email!,
        subject: cycleBillSubject(props),
        react: React.createElement(CycleBillEmail, props),
      })
  );
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * "Your utilities are ready" to every active tenant with a share in the cycle.
 * Safe to call repeatedly: tenants who already got it are counted as alreadySent.
 * Caller must have verified the signed-in user owns the cycle.
 */
export async function sendCycleReadyEmails(cycleId: string): Promise<SendSummary & { recipients: number }> {
  const admin = createAdminClient();
  const [ctx] = await loadCycleContexts(admin, [cycleId]);
  const summary = { ...emptySummary(), recipients: 0 };
  if (!ctx) return summary;

  for (const tenant of ctx.tenants) {
    if (tenant.status !== "active" || !tenant.profileId || !tenant.email || tenant.totalCents <= 0) continue;
    summary.recipients++;
    tally(summary, await sendTenantCycleEmail(admin, ctx, tenant, "cycle_ready"));
  }
  return summary;
}

/** Daily: due-soon and overdue reminders, once each per tenant per cycle. */
export async function runTenantReminders(now = new Date()): Promise<SendSummary & { due_soon: number; overdue: number }> {
  const admin = createAdminClient();
  const today = toUTCDateString(now);
  const summary = { ...emptySummary(), due_soon: 0, overdue: 0 };

  // Published cycles with a due date no more than DUE_SOON_WINDOW_DAYS ahead.
  const horizon = toUTCDateString(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000));
  const { data: cycles, error } = await admin
    .from("billing_cycles")
    .select("id")
    .in("status", ["open", "closed"])
    .not("due_date", "is", null)
    .lte("due_date", horizon);
  if (error) throw new Error(error.message);
  const contexts = await loadCycleContexts(admin, (cycles ?? []).map((c) => c.id));
  if (contexts.length === 0) return summary;

  const { data: sentRows } = await admin
    .from("cycle_notifications")
    .select("cycle_id, property_tenant_id, kind")
    .in(
      "cycle_id",
      contexts.map((c) => c.cycleId)
    )
    .in("kind", ["due_soon", "overdue"])
    .neq("status", "failed");
  const sent = new Map<string, NotificationKind[]>();
  for (const r of sentRows ?? []) {
    const key = `${r.cycle_id}:${r.property_tenant_id}`;
    sent.set(key, [...(sent.get(key) ?? []), r.kind]);
  }

  const lookup = new Map<string, { ctx: CycleContext; tenant: TenantShare }>();
  const candidates: ReminderCandidate[] = [];
  for (const ctx of contexts) {
    for (const tenant of ctx.tenants) {
      if (tenant.status === "invited" || !tenant.profileId) continue;
      const key = `${ctx.cycleId}:${tenant.propertyTenantId}`;
      lookup.set(key, { ctx, tenant });
      candidates.push({
        cycleId: ctx.cycleId,
        propertyTenantId: tenant.propertyTenantId,
        cycleStatus: ctx.status,
        dueDate: ctx.dueDate,
        owedCents: tenant.owedCents,
        alreadySent: sent.get(key) ?? [],
        remindersEnabled: tenant.remindersEnabled,
        hasEmail: !!tenant.email,
      });
    }
  }

  for (const { candidate, kind } of planReminders(today, candidates)) {
    const { ctx, tenant } = lookup.get(`${candidate.cycleId}:${candidate.propertyTenantId}`)!;
    const outcome = await sendTenantCycleEmail(admin, ctx, tenant, kind);
    tally(summary, outcome);
    if (outcome !== "duplicate") summary[kind]++;
  }
  return summary;
}

/** Daily: each owner gets one digest of payments newly marked paid and awaiting confirmation. */
export async function runOwnerDigests(now = new Date()): Promise<SendSummary & { owners: number }> {
  const admin = createAdminClient();
  const today = toUTCDateString(now);
  const summary = { ...emptySummary(), owners: 0 };
  const lookback = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: splits, error } = await admin
    .from("bill_splits")
    .select(
      "amount_cents, payment_status, marked_paid_at, payment_note, tenant_id, bills!inner(cycle_id, billing_cycles!inner(label)), properties!inner(name, owner_id, deleted_at), property_tenants!inner(display_name)"
    )
    .eq("payment_status", "marked_paid")
    .gt("marked_paid_at", lookback);
  if (error) throw new Error(error.message);

  type Row = {
    ownerId: string;
    markedPaidAt: string | null;
    paymentStatus: string;
    amountCents: number;
    cycleId: string;
    cycleLabel: string;
    propertyName: string;
    tenantId: string;
    tenantName: string;
    note: string | null;
  };
  const rows: Row[] = [];
  for (const s of splits ?? []) {
    const bill = s.bills as unknown as { cycle_id: string; billing_cycles: { label: string } };
    const prop = s.properties as unknown as { name: string; owner_id: string; deleted_at: string | null };
    const pt = s.property_tenants as unknown as { display_name: string };
    if (prop.deleted_at) continue;
    rows.push({
      ownerId: prop.owner_id,
      markedPaidAt: s.marked_paid_at ?? null,
      paymentStatus: s.payment_status ?? "owed",
      amountCents: s.amount_cents,
      cycleId: bill.cycle_id,
      cycleLabel: bill.billing_cycles.label,
      propertyName: prop.name,
      tenantId: s.tenant_id,
      tenantName: pt.display_name,
      note: s.payment_note ?? null,
    });
  }
  const ownerIds = Array.from(new Set(rows.map((r) => r.ownerId)));
  if (ownerIds.length === 0) return summary;

  const [{ data: owners }, { data: lastDigests }] = await Promise.all([
    admin.from("profiles").select("id, email, full_name, email_reminders").in("id", ownerIds),
    admin
      .from("cycle_notifications")
      .select("recipient_id, sent_at")
      .eq("kind", "owner_digest")
      .in("recipient_id", ownerIds)
      .in("status", ["sent", "skipped"])
      .order("sent_at", { ascending: false }),
  ]);
  const lastByOwner = new Map<string, string>();
  for (const d of lastDigests ?? []) {
    if (d.recipient_id && !lastByOwner.has(d.recipient_id)) lastByOwner.set(d.recipient_id, d.sent_at);
  }

  for (const owner of owners ?? []) {
    if (!owner.email || owner.email_reminders === false) continue;
    const fresh = selectDigestItems(
      rows.filter((r) => r.ownerId === owner.id),
      lastByOwner.get(owner.id) ?? null,
      now
    );
    if (fresh.length === 0) continue;

    // One line per tenant per cycle.
    const grouped = new Map<string, OwnerDigestItem>();
    for (const r of fresh) {
      const key = `${r.cycleId}:${r.tenantId}`;
      const item = grouped.get(key) ?? {
        tenantName: r.tenantName,
        propertyName: r.propertyName,
        cycleLabel: r.cycleLabel,
        amountCents: 0,
        note: r.note,
      };
      item.amountCents += r.amountCents;
      grouped.set(key, item);
    }
    const props = {
      ownerName: owner.full_name,
      items: Array.from(grouped.values()),
      paymentsUrl: `${appUrl()}/dashboard/owner/payments`,
    };
    summary.owners++;
    tally(
      summary,
      await claimAndSend(
        admin,
        { kind: "owner_digest", recipientId: owner.id, recipientEmail: owner.email, digestDate: today },
        () =>
          deliverEmail({
            to: owner.email,
            subject: ownerDigestSubject(props),
            react: React.createElement(OwnerDigestEmail, props),
          })
      )
    );
  }
  return summary;
}

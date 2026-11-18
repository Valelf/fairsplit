import { Mail } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SendCycleButton } from "@/components/owner/send-cycle-button";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

interface CycleNotifyPanelProps {
  propertyId: string;
  cycleId: string;
}

/** Owner: "Send to tenants" for one cycle, with who has been emailed. Self-contained. */
export async function CycleNotifyPanel({ propertyId, cycleId }: CycleNotifyPanelProps) {
  const supabase = createClient();
  const [{ data: cycle }, { count: billCount }, { data: tenants }, { data: log }] = await Promise.all([
    supabase
      .from("billing_cycles")
      .select("id, status, published_at")
      .eq("id", cycleId)
      .eq("property_id", propertyId)
      .maybeSingle(),
    supabase.from("bills").select("id", { count: "exact", head: true }).eq("cycle_id", cycleId),
    supabase
      .from("property_tenants")
      .select("id")
      .eq("property_id", propertyId)
      .eq("status", "active")
      .not("tenant_id", "is", null),
    supabase
      .from("cycle_notifications")
      .select("property_tenant_id, kind, status, sent_at")
      .eq("cycle_id", cycleId)
      .order("sent_at", { ascending: false }),
  ]);
  if (!cycle) return null;

  const activeIds = new Set((tenants ?? []).map((t) => t.id));
  const notified = new Set(
    (log ?? [])
      .filter((r) => r.kind === "cycle_ready" && r.status !== "failed" && r.property_tenant_id)
      .map((r) => r.property_tenant_id as string)
  );
  const notifiedActive = Array.from(activeIds).filter((id) => notified.has(id)).length;
  const reminders = (log ?? []).filter((r) => r.kind !== "cycle_ready" && r.status !== "failed").length;
  const allSent = activeIds.size > 0 && notifiedActive >= activeIds.size;
  const hasBills = (billCount ?? 0) > 0;

  let description: string;
  if (!hasBills) description = "Add a bill, then send tenants their share by email.";
  else if (!cycle.published_at && notified.size === 0)
    description = "Not sent yet. Tenants get an email with their share, the person-days math and how to pay you.";
  else
    description = `Sent to ${notifiedActive} of ${activeIds.size} active tenant${activeIds.size === 1 ? "" : "s"}${
      cycle.published_at ? ` · first sent ${formatDate(cycle.published_at)}` : ""
    }${reminders ? ` · ${reminders} reminder${reminders === 1 ? "" : "s"}` : ""}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" aria-hidden="true" />
              Tenant emails
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {hasBills && <SendCycleButton cycleId={cycleId} propertyId={propertyId} allSent={allSent} />}
        </div>
      </CardHeader>
    </Card>
  );
}

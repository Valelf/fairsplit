import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Receipt } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { CycleStatePill } from "@/components/shared/cycle-state-pill";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

interface PageProps {
  params: { propertyId: string };
}

export default async function TenantBillsPage({ params }: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify tenant belongs to this property
  const { data: tenantRecord } = await supabase
    .from("property_tenants")
    .select("*, properties(*)")
    .eq("property_id", params.propertyId)
    .eq("tenant_id", user.id)
    .in("status", ["active", "departed"])
    .single();

  if (!tenantRecord) notFound();

  const property = tenantRecord.properties as any;

  // Fetch billing cycles
  const { data: cycles } = await supabase
    .from("billing_cycles")
    .select("*")
    .eq("property_id", params.propertyId)
    .order("created_at", { ascending: false });

  // Fetch tenant's splits
  const { data: splits } = await supabase
    .from("bill_splits")
    .select("*, bills(*)")
    .eq("tenant_id", tenantRecord.id);

  // Group splits by cycle
  const splitsByCycle = new Map<string, { total: number; bills: any[] }>();
  for (const split of splits || []) {
    const bill = split.bills as any;
    if (!bill) continue;
    const cycleId = bill.cycle_id;
    if (!splitsByCycle.has(cycleId)) {
      splitsByCycle.set(cycleId, { total: 0, bills: [] });
    }
    const entry = splitsByCycle.get(cycleId)!;
    entry.total += split.amount_cents;
    entry.bills.push({ ...split, bill });
  }

  return (
    <div className="space-y-6">
      <PageHeading
        backHref="/dashboard/tenant/properties"
        backLabel="My homes"
        title={property.name}
        description="Your share of each billing cycle."
      />

      {cycles && cycles.length > 0 ? (
        <ul className="space-y-2 sm:space-y-3">
          {cycles.map((cycle) => {
            const cycleData = splitsByCycle.get(cycle.id);
            const myTotal = cycleData?.total || 0;
            const billCount = cycleData?.bills.length || 0;

            return (
              <li key={cycle.id}>
                <Link
                  href={`/dashboard/tenant/properties/${params.propertyId}/bills/${cycle.id}`}
                  className="group block rounded-xl"
                >
                  <Card className="transition-colors group-hover:border-primary/40 group-hover:bg-accent/40">
                    <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-base font-semibold sm:text-lg">{cycle.label}</h2>
                          <CycleStatePill status={cycle.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="figure">{billCount}</span> {billCount === 1 ? "bill" : "bills"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="text-right">
                          <p className="figure text-lg font-medium sm:text-xl">
                            {formatCents(myTotal)}
                          </p>
                          <p className="text-xs text-muted-foreground">Your share</p>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyPanel
          icon={Receipt}
          title="No billing cycles yet"
          description="Your landlord hasn't added bills here yet. Each cycle appears once they do."
        />
      )}
    </div>
  );
}

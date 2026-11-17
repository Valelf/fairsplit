import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tenant/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {property.name}
          </h1>
          <p className="text-muted-foreground">
            Your bill breakdown by cycle
          </p>
        </div>
      </div>

      {cycles && cycles.length > 0 ? (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const cycleData = splitsByCycle.get(cycle.id);
            const myTotal = cycleData?.total || 0;

            return (
              <Link
                key={cycle.id}
                href={`/dashboard/tenant/properties/${params.propertyId}/bills/${cycle.id}`}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{cycle.label}</p>
                        <Badge
                          variant={
                            cycle.status === "closed"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {cycle.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cycleData?.bills.length || 0} bills
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCents(myTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your share
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Receipt className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No billing cycles yet. Your landlord will add bills soon.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

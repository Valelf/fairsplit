import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flag } from "lucide-react";
import Link from "next/link";
import { FlagCard } from "@/components/owner/flag-card";
import { FlagsFilterTabs } from "@/components/owner/flags-filter-tabs";

interface PageProps {
  params: { propertyId: string };
  searchParams: { status?: string };
}

export default async function PropertyFlagsPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", params.propertyId)
    .eq("owner_id", user.id)
    .single();

  if (!property) notFound();

  const statusFilter = searchParams.status || "all";

  let query = supabase
    .from("bill_flags")
    .select(
      "*, bills(category, provider, amount_cents), property_tenants(display_name, email)"
    )
    .eq("property_id", params.propertyId)
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter as any);
  }

  const { data: flags } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/dashboard/owner/properties/${params.propertyId}/overview`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bill Flags</h1>
          <p className="text-muted-foreground">{property.name}</p>
        </div>
      </div>

      <FlagsFilterTabs
        propertyId={params.propertyId}
        currentFilter={statusFilter}
      />

      {flags && flags.length > 0 ? (
        <div className="space-y-4">
          {flags.map((flag: any) => (
            <FlagCard key={flag.id} flag={flag} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Flag className="h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No flags {statusFilter !== "all" ? `with status "${statusFilter}"` : ""} found.
          </p>
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, Plus, MapPin, Eye, EyeOff, ChevronRight } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { EmptyPanel } from "@/components/shared/empty-panel";
import Link from "next/link";

export default async function OwnerPropertiesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const addButton = (
    <Button asChild>
      <Link href="/dashboard/owner/properties/new">
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add Property
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Properties"
        description="Manage your rental properties"
        actions={properties && properties.length > 0 ? addButton : undefined}
      />

      {properties && properties.length > 0 ? (
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/dashboard/owner/properties/${property.id}/overview`}
                className="group flex h-full flex-col rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  >
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="truncate font-display text-base font-semibold">{property.name}</h2>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {property.city}, {property.state} {property.zip_code}
                      </span>
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-4 flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  {property.transparency_level === "full" ? (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {property.transparency_level === "full"
                      ? "Full transparency"
                      : "Own share only"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start managing bills and tenants."
          action={addButton}
        />
      )}
    </div>
  );
}

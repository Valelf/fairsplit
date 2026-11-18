import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Revalidate every owner page under a property (overview, cycles, bills, tenants, flags),
 * the owner property list/dashboard, and tenant pages that show the same splits.
 * Uses layout-scope revalidation because /dashboard/owner/properties/[id] itself has no page.
 */
export function revalidatePropertyPages(propertyId: string) {
  revalidatePath(`/dashboard/owner/properties/${propertyId}`, "layout");
  revalidatePath("/dashboard/owner/properties");
  revalidatePath("/dashboard/owner/dashboard");
  revalidatePath("/dashboard/tenant", "layout");
}

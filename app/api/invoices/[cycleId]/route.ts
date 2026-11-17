import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "@/components/shared/invoice-pdf";
import { generateInvoiceNumber } from "@/lib/utils/invoice-number";
import React from "react";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { cycleId: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tenantRecordId = request.nextUrl.searchParams.get("tenantId");

  // Fetch cycle
  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("*, properties(*)")
    .eq("id", params.cycleId)
    .single();

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  const property = (cycle as any).properties;

  // Fetch bills
  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .eq("cycle_id", cycle.id)
    .order("category", { ascending: true });

  if (!bills || bills.length === 0) {
    return NextResponse.json({ error: "No bills in cycle" }, { status: 400 });
  }

  // Determine which tenant to generate invoice for
  let targetTenantId = tenantRecordId;

  if (!targetTenantId) {
    // If no tenant specified, check if user is a tenant of this property
    const { data: tenantRecord } = await supabase
      .from("property_tenants")
      .select("id")
      .eq("property_id", property.id)
      .eq("tenant_id", user.id)
      .in("status", ["active", "departed"])
      .single();

    if (tenantRecord) {
      targetTenantId = tenantRecord.id;
    } else {
      return NextResponse.json(
        { error: "Tenant not specified" },
        { status: 400 }
      );
    }
  }

  // Fetch tenant info
  const { data: tenant } = await supabase
    .from("property_tenants")
    .select("*")
    .eq("id", targetTenantId)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Fetch splits for this tenant and these bills
  const { data: splits } = await supabase
    .from("bill_splits")
    .select("*")
    .eq("tenant_id", targetTenantId)
    .in(
      "bill_id",
      bills.map((b) => b.id)
    );

  const splitsMap = new Map(splits?.map((s) => [s.bill_id, s]) || []);

  const invoiceBills = bills.map((bill) => {
    const split = splitsMap.get(bill.id);
    return {
      category: bill.category,
      provider: bill.provider,
      serviceStart: bill.service_start,
      serviceEnd: bill.service_end,
      totalAmountCents: bill.amount_cents,
      tenantAmountCents: split?.amount_cents || 0,
      personDays: split?.person_days || 0,
      totalPersonDays: split?.total_person_days || 0,
    };
  });

  const totalCents = invoiceBills.reduce(
    (sum, b) => sum + b.tenantAmountCents,
    0
  );

  const invoiceNumber = generateInvoiceNumber(
    property.name,
    cycle.label,
    tenant.display_name
  );

  const today = new Date().toISOString().split("T")[0];

  const invoiceData = {
    invoiceNumber,
    propertyName: property.name,
    propertyAddress: `${property.address_line1}, ${property.city}, ${property.state} ${property.zip_code}`,
    cycleLabel: cycle.label,
    tenantName: tenant.display_name,
    tenantEmail: tenant.email,
    bills: invoiceBills,
    totalCents,
    generatedAt: today,
  };

  try {
    const buffer = await renderToBuffer(
      React.createElement(InvoicePdf, { data: invoiceData }) as any
    );

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

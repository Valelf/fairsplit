import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { billId: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get the bill
  const { data: bill } = await supabase
    .from("bills")
    .select("pdf_storage_path")
    .eq("id", params.billId)
    .single();

  if (!bill || !bill.pdf_storage_path) {
    return NextResponse.json(
      { error: "PDF not found" },
      { status: 404 }
    );
  }

  // Generate a signed URL (valid for 1 hour)
  const { data: signedUrl, error } = await supabase.storage
    .from("bill-pdfs")
    .createSignedUrl(bill.pdf_storage_path, 3600);

  if (error || !signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrl.signedUrl });
}

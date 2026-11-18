import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { BILL_CATEGORY_VALUES } from "@/lib/utilities/categories";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const requestSchema = z.object({
  property_id: z.string({ error: "Invalid property" }).uuid("Invalid property"),
  file: z
    .instanceof(File, { message: "PDF file required" })
    .refine((f) => f.type === "application/pdf", "PDF file required")
    .refine((f) => f.size > 0, "PDF file required")
    .refine((f) => f.size <= MAX_PDF_BYTES, "File too large (max 10MB)"),
});

const confidenceLevel = z.enum(["high", "medium", "low"]).catch("low");

/** Shape returned to the client; anything the model gets wrong becomes null / "low". */
const parsedBillSchema = z.object({
  category: z.enum(BILL_CATEGORY_VALUES).nullable().catch(null),
  provider: z.string().trim().min(1).max(120).nullable().catch(null),
  amount: z.number().positive().max(1_000_000).nullable().catch(null),
  service_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  service_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  confidence: z
    .object({
      category: confidenceLevel,
      provider: confidenceLevel,
      amount: confidenceLevel,
      service_start: confidenceLevel,
      service_end: confidenceLevel,
    })
    .partial()
    .catch({}),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Paid AI call: landlords (and admins) only, never tenants.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Only landlords can parse bills" }, { status: 403 });
  }

  // Rate limit
  const rateCheck = checkRateLimit(`parse-pdf:${user.id}`);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limited",
        retryAfterMs: rateCheck.retryAfterMs,
      },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const input = requestSchema.safeParse({
    property_id: formData.get("property_id"),
    file: formData.get("file"),
  });
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0].message }, { status: 400 });
  }
  const { file, property_id } = input.data;

  // Only the owner of the property may parse bills for it
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!property) {
    return NextResponse.json({ error: "Property not found or access denied" }, { status: 403 });
  }

  // Only after auth + ownership: tell owners when AI parsing is not configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "PDF parsing not configured",
        fallback: true,
        message:
          "ANTHROPIC_API_KEY is not configured. Please enter bill details manually.",
      },
      { status: 200 }
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Extract the following information from this utility bill PDF. Return ONLY a JSON object with these fields:

{
  "category": "internet" | "electricity" | "water" | "gas" | "trash" | "other",
  "provider": "string (company name)",
  "amount": number (total amount due in dollars, e.g. 95.49),
  "service_start": "YYYY-MM-DD",
  "service_end": "YYYY-MM-DD",
  "confidence": {
    "category": "high" | "medium" | "low",
    "provider": "high" | "medium" | "low",
    "amount": "high" | "medium" | "low",
    "service_start": "high" | "medium" | "low",
    "service_end": "high" | "medium" | "low"
  }
}

Rules:
- For category, map: cable/fiber/broadband -> "internet", electric/power -> "electricity", water/sewer -> "water", natural gas -> "gas", trash/garbage/waste/recycling -> "trash", everything else -> "other"
- Use "high" confidence when clearly stated, "medium" when inferred, "low" when guessing
- If a field cannot be determined, use null for the value and "low" for confidence
- Return ONLY the JSON, no other text`,
            },
          ],
        },
      ],
    });

    // Extract the JSON from the response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    // Try to parse the JSON from the response
    let parsed: unknown;
    try {
      // Handle cases where the response might have markdown code blocks
      let jsonStr = textContent.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    const cleaned = parsedBillSchema.safeParse(parsed);
    if (!cleaned.success) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    return NextResponse.json({
      data: cleaned.data,
      fallback: false,
    });
  } catch (err) {
    console.error("PDF parsing error:", err);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}

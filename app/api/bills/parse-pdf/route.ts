import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Check for API key upfront
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
  const rateCheck = checkRateLimit(user.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Rate limited",
        retryAfterMs: rateCheck.retryAfterMs,
      },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "PDF file required" },
      { status: 400 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
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
  "category": "internet" | "electricity" | "water" | "other",
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
- For category, map: cable/fiber/broadband -> "internet", electric/power -> "electricity", water/sewer -> "water", everything else -> "other"
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
    let parsed;
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

    return NextResponse.json({
      data: parsed,
      fallback: false,
    });
  } catch (err: any) {
    console.error("PDF parsing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to parse PDF" },
      { status: 500 }
    );
  }
}

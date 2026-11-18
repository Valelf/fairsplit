import "server-only";

import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

export type DeliveryStatus = "sent" | "skipped" | "failed";

export interface DeliveryResult {
  status: DeliveryStatus;
  providerId: string | null;
  error: string | null;
}

export const DEFAULT_EMAIL_FROM = "FairSplit <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/** Public base URL for links in emails. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/**
 * Render a React Email template and send it through Resend.
 * Without RESEND_API_KEY nothing is sent: the email is logged and reported as "skipped".
 */
export async function deliverEmail(options: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<DeliveryResult> {
  const resend = getClient();
  if (!resend) {
    console.log(`[email] skipped (no RESEND_API_KEY): "${options.subject}" -> ${options.to}`);
    return { status: "skipped", providerId: null, error: null };
  }

  try {
    const [html, text] = await Promise.all([
      render(options.react),
      render(options.react, { plainText: true }),
    ]);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { status: "failed", providerId: null, error: error.message };
    }
    return { status: "sent", providerId: data?.id ?? null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send error:", message);
    return { status: "failed", providerId: null, error: message };
  }
}

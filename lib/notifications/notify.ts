"use server";

import { createNotification } from "@/lib/actions/notifications";
import { sendEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";

interface NotifyUserOptions {
  userId: string;
  type: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  email?: {
    subject: string;
    html: string;
  };
}

/**
 * Dual delivery: creates in-app notification + sends email if configured.
 * Email is best-effort and never blocks the in-app notification.
 */
export async function notifyUser(options: NotifyUserOptions) {
  // Always create in-app notification
  await createNotification(
    options.userId,
    options.type,
    options.title,
    options.body,
    options.metadata
  );

  // Send email if template provided
  if (options.email) {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", options.userId)
      .single();

    if (profile?.email) {
      // Fire and forget - don't block on email
      sendEmail({
        to: profile.email,
        subject: options.email.subject,
        html: options.email.html,
      }).catch((err) => {
        console.error("Email notification error:", err);
      });
    }
  }
}

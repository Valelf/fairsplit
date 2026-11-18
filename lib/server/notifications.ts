import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";

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
    const supabase = createAdminClient();
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

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  metadata?: Record<string, unknown>
) {
  // Service-role client: notifications are system-generated; RLS denies direct inserts.
  const supabase = createAdminClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body || null,
    metadata: metadata || {},
    is_read: false,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}


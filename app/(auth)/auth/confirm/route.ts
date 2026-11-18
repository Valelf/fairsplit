import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Email link landing route. Handles both Supabase link styles:
 *  - PKCE (default for @supabase/ssr): ?code=...
 *  - token hash (custom email template): ?token_hash=...&type=...
 * Optional ?next=/some/path (must be a same-site relative path) to continue a flow,
 * e.g. /claim/<token> so the invite is claimed right after sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  const supabase = createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  }

  if (!ok) redirect("/login?error=verification_failed");
  if (next) redirect(next);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  redirect(`/dashboard/${profile?.role ?? "tenant"}/dashboard`);
}

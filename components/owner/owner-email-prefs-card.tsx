import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailRemindersToggle } from "@/components/shared/email-reminders-toggle";
import { createClient } from "@/lib/supabase/server";

/** Owner: opt in/out of the daily "payments to confirm" digest. Self-contained. */
export async function OwnerEmailPrefsCard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("email_reminders")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>What FairSplit emails you</CardDescription>
      </CardHeader>
      <CardContent>
        <EmailRemindersToggle
          enabled={profile?.email_reminders ?? true}
          label="Daily payments digest"
          description="One email on days when tenants mark payments as paid, so you can confirm them."
        />
      </CardContent>
    </Card>
  );
}

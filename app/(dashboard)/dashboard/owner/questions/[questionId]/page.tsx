import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { QuestionMessages } from "@/components/shared/question-messages";
import { QuestionComposer } from "@/components/shared/question-composer";
import { QuestionStatusPill } from "@/components/shared/question-status-pill";
import { QuestionResolveDialog } from "@/components/owner/question-resolve-dialog";
import { createClient } from "@/lib/supabase/server";
import { formatCents, formatDateRange } from "@/lib/utils";

interface PageProps {
  params: { questionId: string };
}

export default async function OwnerQuestionPage({ params }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!z.string().uuid().safeParse(params.questionId).success) notFound();

  const { data: question } = await supabase
    .from("bill_questions")
    .select("*")
    .eq("id", params.questionId)
    .maybeSingle();
  if (!question) notFound();

  // Owner-only page: admins can read threads under RLS but don't get the owner controls.
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", question.property_id)
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!property) notFound();

  const [{ data: bill }, { data: tenant }, { data: messages }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, category, provider, amount_cents, service_start, service_end, cycle_id")
      .eq("id", question.bill_id)
      .maybeSingle(),
    supabase.from("property_tenants").select("display_name").eq("id", question.tenant_id).maybeSingle(),
    supabase
      .from("bill_question_messages")
      .select("id, author_id, body, created_at")
      .eq("question_id", question.id)
      .order("created_at", { ascending: true }),
  ]);
  if (!bill) notFound();
  const { data: cycle } = await supabase
    .from("billing_cycles")
    .select("id, label, status")
    .eq("id", bill.cycle_id)
    .maybeSingle();

  const tenantName = tenant?.display_name || "Tenant";
  const resolved = question.status === "resolved";

  return (
    <div className="space-y-6">
      <PageHeading
        backHref="/dashboard/owner/questions"
        backLabel="All questions"
        title={<span className="capitalize">{bill.category} bill question</span>}
        badges={<QuestionStatusPill status={question.status} viewer="owner" />}
        description={`${tenantName} · ${property.name}`}
        actions={
          !resolved ? (
            <QuestionResolveDialog
              questionId={question.id}
              currentAmountCents={bill.amount_cents}
              cycleClosed={cycle?.status === "closed"}
            />
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="order-2 lg:order-1">
          <CardHeader>
            <CardTitle className="font-display text-lg">Conversation</CardTitle>
            <CardDescription>Only you and {tenantName} see this.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <QuestionMessages
              messages={(messages ?? []).map((m) => ({
                id: m.id,
                body: m.body,
                created_at: m.created_at,
                mine: m.author_id === user.id,
                authorLabel: m.author_id === user.id ? "You" : tenantName,
              }))}
            />
            {resolved ? (
              <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                Resolved
                {question.corrected_amount_cents ? (
                  <>
                    {" "}
                    with the bill corrected to{" "}
                    <span className="figure">{formatCents(question.corrected_amount_cents)}</span>
                  </>
                ) : null}
                . The tenant can start a new question if something else comes up.
              </p>
            ) : (
              <div className="border-t pt-4">
                <QuestionComposer
                  id="owner-reply"
                  target={{ kind: "reply", questionId: question.id }}
                  label={`Reply to ${tenantName}`}
                  placeholder="Explain the charge, or ask for details"
                  submitLabel="Send reply"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="order-1 h-fit lg:order-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">The bill</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Provider</dt>
                <dd className="text-right">{bill.provider}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="figure text-right font-medium">{formatCents(bill.amount_cents)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Service</dt>
                <dd className="text-right">{formatDateRange(bill.service_start, bill.service_end)}</dd>
              </div>
              {cycle && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Cycle</dt>
                  <dd className="text-right">
                    <Link
                      href={`/dashboard/owner/properties/${property.id}/cycles/${cycle.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {cycle.label}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

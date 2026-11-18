"use client";

import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { QuestionMessages, type QuestionMessageView } from "@/components/shared/question-messages";
import { QuestionComposer } from "@/components/shared/question-composer";
import { QuestionStatusPill } from "@/components/shared/question-status-pill";
import { formatCents } from "@/lib/utils";
import type { BillQuestionStatus } from "@/lib/supabase/types";

export interface TenantBillThread {
  id: string;
  status: BillQuestionStatus;
  messages: QuestionMessageView[];
}

/** "Ask about this bill" button + side drawer with the tenant's conversation with their landlord. */
export function BillQuestionSheet({
  billId,
  category,
  provider,
  amountCents,
  thread,
  defaultOpen = false,
}: {
  billId: string;
  category: string;
  provider: string;
  amountCents: number;
  /** The tenant's latest thread on this bill, if any. */
  thread: TenantBillThread | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const resolved = thread?.status === "resolved";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex flex-wrap items-center gap-2">
        {thread && <QuestionStatusPill status={thread.status} viewer="tenant" />}
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" aria-label={`${thread ? "View question" : "Ask"} about the ${category} bill`}>
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            {thread && !resolved ? "View question" : "Ask about this bill"}
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="capitalize">{category} bill</SheetTitle>
          <SheetDescription>
            {provider} · <span className="figure">{formatCents(amountCents)}</span>. Only you and your landlord
            see this conversation.
          </SheetDescription>
        </SheetHeader>

        {thread && (
          <div className="flex-1 space-y-3">
            <QuestionStatusPill status={thread.status} viewer="tenant" />
            <QuestionMessages messages={thread.messages} />
          </div>
        )}

        <div className="border-t pt-4">
          {resolved && (
            <p className="mb-3 text-sm text-muted-foreground">
              This question is resolved. Still something off? Start a new one.
            </p>
          )}
          <QuestionComposer
            id={`question-${billId}`}
            target={{ kind: "ask", billId }}
            label={thread && !resolved ? "Reply" : "Your question"}
            placeholder={thread && !resolved ? "Add a message" : "e.g. This is higher than last month. Was there a rate change?"}
            submitLabel={thread && !resolved ? "Send" : "Ask landlord"}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

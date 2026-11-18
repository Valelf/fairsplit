"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { askQuestion, replyToQuestion } from "@/lib/actions/questions";
import { QUESTION_BODY_MAX } from "@/lib/questions/helpers";

type Target = { kind: "ask"; billId: string } | { kind: "reply"; questionId: string };

/** Message box for a bill question: asks (tenant) or replies (either side), then refreshes the page. */
export function QuestionComposer({
  target,
  label = "Your message",
  placeholder = "What looks off?",
  submitLabel = "Send",
  id = "question-message",
}: {
  target: Target;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  id?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res =
        target.kind === "ask"
          ? await askQuestion({ billId: target.billId, body })
          : await replyToQuestion({ questionId: target.questionId, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={QUESTION_BODY_MAX}
        rows={3}
        required
        placeholder={placeholder}
        aria-describedby={error ? `${id}-error` : undefined}
        className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="figure text-xs text-muted-foreground" aria-live="polite">
          {body.length > QUESTION_BODY_MAX - 200 ? `${body.length} / ${QUESTION_BODY_MAX}` : ""}
        </p>
        <Button type="submit" size="sm" disabled={pending || body.trim().length === 0}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
          {submitLabel}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

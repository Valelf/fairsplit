import { cn } from "@/lib/utils";

export interface QuestionMessageView {
  id: string;
  body: string;
  created_at: string;
  /** Display name for the author ("You", "Landlord", a tenant's name). */
  authorLabel: string;
  /** True when the viewer wrote it: aligned right, tinted. */
  mine: boolean;
}

const timeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

/** A bill-question conversation, oldest first. */
export function QuestionMessages({
  messages,
  emptyText = "No messages yet.",
  className,
}: {
  messages: QuestionMessageView[];
  emptyText?: string;
  className?: string;
}) {
  if (messages.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p>;
  }
  return (
    <ol className={cn("space-y-3", className)} aria-label="Messages">
      {messages.map((m) => (
        <li key={m.id} className={cn("flex flex-col gap-1", m.mine ? "items-end" : "items-start")}>
          <div
            className={cn(
              "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm",
              m.mine ? "bg-primary text-primary-foreground" : "border bg-card text-card-foreground"
            )}
          >
            {m.body}
          </div>
          <p className="text-xs text-muted-foreground">
            {m.authorLabel} · <time dateTime={m.created_at}>{timeFormat.format(new Date(m.created_at))} UTC</time>
          </p>
        </li>
      ))}
    </ol>
  );
}

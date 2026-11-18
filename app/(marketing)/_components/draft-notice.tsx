import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftNoticeProps {
  children?: React.ReactNode;
  className?: string;
}

/** Banner for documents that are drafts and must be reviewed by a lawyer. */
export function DraftNotice({ children, className }: DraftNoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-lg border border-warning-soft-foreground/30 bg-warning-soft p-4 text-warning-soft-foreground",
        className
      )}
    >
      <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        <p className="font-semibold">Draft — not legal advice; to be reviewed by a lawyer before launch.</p>
        {children && <div className="mt-1">{children}</div>}
      </div>
    </div>
  );
}

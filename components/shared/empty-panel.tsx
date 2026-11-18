import { cn } from "@/lib/utils";

interface EmptyPanelProps {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Empty state: what is missing and what to do next. Dashed so it reads as a slot. */
export function EmptyPanel({ icon: Icon, title, description, action, className }: EmptyPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center",
        className
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

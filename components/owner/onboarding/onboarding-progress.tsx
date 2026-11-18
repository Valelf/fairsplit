import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, STEP_LABELS, type OnboardingStep } from "@/lib/onboarding/steps";

interface OnboardingProgressProps {
  current: OnboardingStep;
  /** Steps that already have data saved (shown with a check). */
  completed?: Partial<Record<OnboardingStep, boolean>>;
  /** Steps that can be jumped to. Others render as plain text. */
  reachable?: Partial<Record<OnboardingStep, boolean>>;
}

/** Numbered step indicator for the onboarding wizard (molecule). */
export function OnboardingProgress({ current, completed = {}, reachable = {} }: OnboardingProgressProps) {
  const currentIndex = ONBOARDING_STEPS.indexOf(current);
  return (
    <nav aria-label="Setup progress">
      <p className="mb-2 text-sm text-muted-foreground">
        Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
      </p>
      <ol className="grid grid-cols-4 gap-2">
        {ONBOARDING_STEPS.map((step, i) => {
          const isCurrent = step === current;
          const isDone = completed[step] && !isCurrent;
          const content = (
            <>
              <span
                className={cn(
                  "h-1.5 w-full rounded-full",
                  isCurrent || i < currentIndex || isDone ? "bg-primary" : "bg-muted"
                )}
                aria-hidden="true"
              />
              <span className="flex items-center gap-1 text-xs sm:text-sm">
                {isDone && <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />}
                <span className={cn(isCurrent ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {STEP_LABELS[step]}
                </span>
                {isDone && <span className="sr-only">(saved)</span>}
              </span>
            </>
          );
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined}>
              {reachable[step] && !isCurrent ? (
                <Link
                  href={`/onboarding?step=${step}`}
                  className="flex flex-col gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex flex-col gap-2">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

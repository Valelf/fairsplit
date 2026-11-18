import Link from "next/link";
import { ArrowRight, Home, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingEmptyStateProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
  href?: string;
}

const STEPS = [
  { icon: Home, text: "Name your house" },
  { icon: Users, text: "Add tenants and their move-in dates" },
  { icon: Receipt, text: "Enter one bill and see the split" },
];

/** Owner dashboard when there are no houses yet: points to the setup wizard (organism). */
export function OnboardingEmptyState({
  title = "Set up your first house",
  description = "Get to your first fair split in about five minutes.",
  ctaLabel = "Start setup",
  href = "/onboarding",
}: OnboardingEmptyStateProps) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="space-y-3">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="sr-only">Step {i + 1}: </span>
                {text}
              </span>
            </li>
          ))}
        </ol>
        <Button asChild className="w-full">
          <Link href={href}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

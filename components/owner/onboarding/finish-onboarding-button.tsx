"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/actions/onboarding";

interface FinishOnboardingButtonProps {
  label?: string;
  variant?: "default" | "ghost" | "outline";
}

/** Marks onboarding complete, then does a full load of the owner dashboard. */
export function FinishOnboardingButton({ label = "Go to my dashboard", variant = "default" }: FinishOnboardingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setLoading(true);
    setError(null);
    const result = await completeOnboarding();
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.assign("/dashboard/owner/dashboard");
  }

  return (
    <div className="space-y-2">
      <Button onClick={finish} disabled={loading} variant={variant} className="w-full sm:w-auto">
        {label}
        {loading ? (
          <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

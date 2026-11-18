"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { grantPlan, updateSubscriptionComp } from "@/lib/actions/admin";
import {
  COMP_PRESET_LABELS,
  computeCompUntil,
  todayUTC,
  type CompPreset,
} from "@/lib/admin/comp";
import { formatCompUntil } from "@/components/admin/comp-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExtendProps = {
  mode: "extend";
  subscriptionId: string;
  currentCompUntil: string | null;
  currentNote: string | null;
  triggerLabel?: string;
};

type GrantProps = {
  mode: "grant";
  userId: string;
  plans: { id: string; name: string }[];
  defaultPlanId?: string;
  triggerLabel?: string;
};

export type CompPlanDialogProps = ExtendProps | GrantProps;

export function CompPlanDialog(props: CompPlanDialogProps) {
  const router = useRouter();
  const isGrant = props.mode === "grant";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<CompPreset>("1y");
  const [date, setDate] = useState("");
  const [note, setNote] = useState(props.mode === "extend" ? props.currentNote ?? "" : "");
  const [planId, setPlanId] = useState(
    props.mode === "grant" ? props.defaultPlanId ?? props.plans[0]?.id ?? "" : ""
  );

  const current = props.mode === "extend" ? props.currentCompUntil : null;
  const presets: CompPreset[] = ["6m", "1y", "forever", "date", "clear"];
  const preview = computeCompUntil(preset, current, todayUTC(), date || null);

  function previewText() {
    if ("error" in preview) return preview.error;
    if (preview.value === null) return isGrant ? "Not comped: billed at the plan price" : "Comp ends: billed at the plan price";
    return `Free until ${formatCompUntil(preview.value)}`;
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const common = { preset, date: preset === "date" ? date : null, note: note.trim() || undefined };
    const result =
      props.mode === "grant"
        ? await grantPlan({ userId: props.userId, planId, ...common })
        : await updateSubscriptionComp({ subscriptionId: props.subscriptionId, ...common });
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const label = props.triggerLabel ?? (isGrant ? "Grant plan" : "Extend");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={isGrant ? "default" : "outline"} size="sm">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isGrant ? "Grant a plan" : "Extend founding plan"}</DialogTitle>
          <DialogDescription>
            {isGrant
              ? "Give this owner a plan, optionally free for a period."
              : current
                ? `Currently free until ${formatCompUntil(current)}. Extensions add to the current end date.`
                : "This plan isn't comped right now. Extensions start from today."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {props.mode === "grant" && (
            <div className="space-y-2">
              <Label htmlFor="grant-plan">Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="grant-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {props.plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comp-preset">Free period</Label>
            <Select value={preset} onValueChange={(v) => setPreset(v as CompPreset)}>
              <SelectTrigger id="comp-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === "clear" && isGrant ? "Not comped" : COMP_PRESET_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "date" && (
            <div className="space-y-2">
              <Label htmlFor="comp-date">Free until (inclusive)</Label>
              <Input
                id="comp-date"
                type="date"
                min={todayUTC()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comp-note">Note</Label>
            <Input
              id="comp-note"
              placeholder="e.g. Founding customer, Pro free for a year"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {previewText()}
          </p>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || "error" in preview || (isGrant && !planId)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGrant ? "Grant plan" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

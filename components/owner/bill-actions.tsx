"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteBill, updateBill } from "@/lib/actions/bills";
import { centsToInput, dollarsToCents } from "@/lib/owner/money";
import type { Bill, BillCategory } from "@/lib/supabase/types";
import { formatCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { BILL_CATEGORY_OPTIONS } from "@/lib/utilities/categories";

type EditableBill = Pick<
  Bill,
  "id" | "category" | "provider" | "amount_cents" | "service_start" | "service_end" | "notes"
>;

const CATEGORIES: { value: BillCategory; label: string }[] = BILL_CATEGORY_OPTIONS;

/** Edit / delete menu for one bill on the owner cycle page. Hidden when the cycle is closed. */
export function BillActions({ bill }: { bill: EditableBill }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "edit" | "delete">(null);
  const [category, setCategory] = useState<BillCategory>(bill.category);
  const [provider, setProvider] = useState(bill.provider);
  const [amount, setAmount] = useState(centsToInput(bill.amount_cents));
  const [start, setStart] = useState(bill.service_start);
  const [end, setEnd] = useState(bill.service_end);

  function openEdit() {
    setCategory(bill.category);
    setProvider(bill.provider);
    setAmount(centsToInput(bill.amount_cents));
    setStart(bill.service_start);
    setEnd(bill.service_end);
    setDialog("edit");
  }

  const id = bill.id;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${bill.provider} bill`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit bill
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDialog("delete")}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete bill
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={dialog === "edit"}
        onOpenChange={(o) => setDialog(o ? "edit" : null)}
        title="Edit bill"
        description="Saving re-splits this bill between tenants by person-days."
        confirmLabel="Save and re-split"
        onConfirm={async () => {
          const cents = dollarsToCents(amount);
          if (cents === null || cents <= 0) return "Enter an amount like 95.49";
          const result = await updateBill(id, {
            category,
            provider,
            amount_cents: cents,
            service_start: start,
            service_end: end,
            notes: bill.notes,
          });
          if (result.error) return result.error;
          router.refresh();
        }}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`b-cat-${id}`}>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as BillCategory)}>
                <SelectTrigger id={`b-cat-${id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`b-amount-${id}`}>Amount ($)</Label>
              <Input
                id={`b-amount-${id}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`b-provider-${id}`}>Provider</Label>
            <Input id={`b-provider-${id}`} value={provider} onChange={(e) => setProvider(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`b-start-${id}`}>Service start</Label>
              <Input id={`b-start-${id}`} type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`b-end-${id}`}>Service end</Label>
              <Input
                id={`b-end-${id}`}
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => setDialog(o ? "delete" : null)}
        title="Delete this bill?"
        description={`${bill.provider} · ${formatCents(bill.amount_cents)}. Its splits, flags and PDF are deleted too. This can't be undone.`}
        confirmLabel="Delete bill"
        destructive
        onConfirm={async () => {
          const result = await deleteBill(id);
          if (result.error) return result.error;
          router.refresh();
        }}
      />
    </>
  );
}

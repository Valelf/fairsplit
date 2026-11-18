"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, LogOut, MoreHorizontal, Pencil, RefreshCw } from "lucide-react";
import {
  markTenantDeparted,
  previewTenantDates,
  regenerateInvite,
  updateTenant,
} from "@/lib/actions/tenants";
import type { TenantDateChangeRow } from "@/lib/owner/departure";
import type { PropertyTenant } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ProrationPreview } from "@/components/owner/proration-preview";

type TenantRow = Pick<
  PropertyTenant,
  "id" | "display_name" | "email" | "join_date" | "leave_date" | "status" | "tenant_id" | "claimed_at" | "invite_token"
> & { invite_expires_at?: string | null };

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Per-tenant actions on the property overview: edit, invite link, mark departed. */
export function TenantRowActions({ tenant }: { tenant: TenantRow }) {
  const router = useRouter();
  const claimed = !!tenant.claimed_at || !!tenant.tenant_id;
  const canInvite = !claimed && tenant.status !== "departed";

  const [dialog, setDialog] = useState<null | "edit" | "depart" | "regenerate" | "link">(null);
  const [inviteToken, setInviteToken] = useState(tenant.invite_token);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // edit form state
  const [name, setName] = useState(tenant.display_name);
  const [email, setEmail] = useState(tenant.email);
  const [joinDate, setJoinDate] = useState(tenant.join_date);
  const [leaveDate, setLeaveDate] = useState(tenant.leave_date ?? "");

  // proration preview (shared by edit + depart)
  const [preview, setPreview] = useState<TenantDateChangeRow[] | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [departDate, setDepartDate] = useState(tenant.leave_date ?? todayUTC());

  const inviteLink =
    typeof window !== "undefined" && inviteToken ? `${window.location.origin}/claim/${inviteToken}` : "";

  function openEdit() {
    setName(tenant.display_name);
    setEmail(tenant.email);
    setJoinDate(tenant.join_date);
    setLeaveDate(tenant.leave_date ?? "");
    setPreview(null);
    setPreviewKey(null);
    setDialog("edit");
  }

  function openDepart() {
    setDepartDate(tenant.leave_date ?? todayUTC());
    setPreview(null);
    setPreviewKey(null);
    setDialog("depart");
  }

  async function copyLink(link: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Couldn't copy automatically. Select the link and copy it.");
    }
  }

  const editDatesChanged = joinDate !== tenant.join_date || (leaveDate || null) !== tenant.leave_date;
  const editKey = `${joinDate}|${leaveDate}`;
  const editNeedsPreview = editDatesChanged && previewKey !== editKey;
  const departNeedsPreview = previewKey !== `depart|${departDate}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${tenant.display_name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit tenant
          </DropdownMenuItem>
          {canInvite && (
            <>
              <DropdownMenuItem onSelect={() => setDialog("link")}>
                <Link2 className="mr-2 h-4 w-4" />
                Copy invite link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("regenerate")}>
                <RefreshCw className="mr-2 h-4 w-4" />
                New invite link
              </DropdownMenuItem>
            </>
          )}
          {tenant.status !== "departed" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={openDepart} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Mark departed
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit tenant */}
      <ConfirmDialog
        open={dialog === "edit"}
        onOpenChange={(o) => setDialog(o ? "edit" : null)}
        title={`Edit ${tenant.display_name}`}
        description={
          editDatesChanged
            ? "Changing dates re-splits every bill that overlaps the old or new dates."
            : "Update the tenant's details."
        }
        confirmLabel={editNeedsPreview ? "Preview changes" : editDatesChanged ? "Save and re-split" : "Save"}
        onConfirm={async () => {
          if (editNeedsPreview) {
            const r = await previewTenantDates(tenant.id, { joinDate, leaveDate: leaveDate || null });
            if (r.error || !r.data) return r.error ?? "Couldn't preview";
            setPreview(r.data);
            setPreviewKey(editKey);
            return false;
          }
          const result = await updateTenant(tenant.id, {
            display_name: name,
            email,
            join_date: joinDate,
            leave_date: leaveDate || null,
          });
          if (result.error) return result.error;
          router.refresh();
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`t-name-${tenant.id}`}>Name</Label>
            <Input id={`t-name-${tenant.id}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`t-email-${tenant.id}`}>Email</Label>
            <Input
              id={`t-email-${tenant.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={claimed}
              aria-describedby={claimed ? `t-email-help-${tenant.id}` : undefined}
            />
            {claimed && (
              <p id={`t-email-help-${tenant.id}`} className="text-xs text-muted-foreground">
                Locked: the tenant has claimed their invite with this email.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`t-join-${tenant.id}`}>Move-in date</Label>
              <Input
                id={`t-join-${tenant.id}`}
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`t-leave-${tenant.id}`}>Move-out date (optional)</Label>
              <Input
                id={`t-leave-${tenant.id}`}
                type="date"
                value={leaveDate}
                min={joinDate}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </div>
          </div>
          {editDatesChanged && preview && previewKey === editKey && (
            <ProrationPreview rows={preview} tenantName={name || tenant.display_name} />
          )}
        </div>
      </ConfirmDialog>

      {/* Mark departed */}
      <ConfirmDialog
        open={dialog === "depart"}
        onOpenChange={(o) => setDialog(o ? "depart" : null)}
        title={`Mark ${tenant.display_name} as departed`}
        description="Their share is prorated to the last day they lived here (inclusive), and bills are re-split for everyone."
        confirmLabel={departNeedsPreview ? "Preview final shares" : "Confirm departure"}
        destructive={!departNeedsPreview}
        confirmDisabled={!departDate}
        onConfirm={async () => {
          if (departNeedsPreview) {
            const r = await previewTenantDates(tenant.id, { leaveDate: departDate });
            if (r.error || !r.data) return r.error ?? "Couldn't preview";
            setPreview(r.data);
            setPreviewKey(`depart|${departDate}`);
            return false;
          }
          const result = await markTenantDeparted(tenant.id, departDate);
          if (result.error) return result.error;
          router.refresh();
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`t-depart-${tenant.id}`}>Last day in the house</Label>
            <Input
              id={`t-depart-${tenant.id}`}
              type="date"
              value={departDate}
              min={tenant.join_date}
              onChange={(e) => setDepartDate(e.target.value)}
              required
            />
          </div>
          {!departNeedsPreview && preview && (
            <ProrationPreview rows={preview} tenantName={tenant.display_name} />
          )}
        </div>
      </ConfirmDialog>

      {/* Regenerate invite */}
      <ConfirmDialog
        open={dialog === "regenerate"}
        onOpenChange={(o) => setDialog(o ? "regenerate" : null)}
        title="Create a new invite link?"
        description={`The old link for ${tenant.display_name} stops working. The new one is valid for 30 days.`}
        confirmLabel="Create new link"
        onConfirm={async () => {
          const result = await regenerateInvite(tenant.id);
          if (result.error || !result.data) return result.error ?? "Couldn't create a new link";
          setInviteToken(result.data.invite_token);
          setCopied(false);
          setTimeout(() => setDialog("link"), 0);
          router.refresh();
        }}
      />

      {/* Show / copy invite link */}
      <ConfirmDialog
        open={dialog === "link"}
        onOpenChange={(o) => setDialog(o ? "link" : null)}
        title={`Invite link for ${tenant.display_name}`}
        description={`Send this to ${tenant.email}. They sign in with that email to see their bills.`}
        confirmLabel="Done"
        cancelLabel="Close"
        onConfirm={async () => {}}
      >
        <div className="space-y-2">
          <Label htmlFor={`t-link-${tenant.id}`}>Invite link</Label>
          <div className="flex gap-2">
            <Input
              id={`t-link-${tenant.id}`}
              value={inviteLink}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copyLink(inviteLink)}
              aria-label="Copy invite link"
              disabled={!inviteLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {tenant.invite_expires_at && inviteToken === tenant.invite_token && (
            <p className="text-xs text-muted-foreground">
              {new Date(tenant.invite_expires_at) < new Date()
                ? "This link has expired. Create a new one."
                : `Expires ${new Date(tenant.invite_expires_at).toLocaleDateString()}`}
            </p>
          )}
          {copied && (
            <p role="status" className="text-xs text-muted-foreground">
              Copied
            </p>
          )}
          {copyError && <p className="text-xs text-destructive">{copyError}</p>}
        </div>
      </ConfirmDialog>
    </>
  );
}

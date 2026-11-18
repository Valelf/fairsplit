"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeUserRole } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
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
import { Settings, Loader2 } from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

interface UserRoleChangeDialogProps {
  userId: string;
  userName: string;
  currentRole: UserRole;
  /** Show a text button instead of the icon button. */
  triggerLabel?: string;
  disabled?: boolean;
}

const roleHelp: Record<UserRole, string> = {
  admin: "Full platform access, including every property, user and billing setting.",
  owner: "Can create properties, add bills and invite tenants.",
  tenant: "Can only see bills for properties they've joined.",
};

export function UserRoleChangeDialog({
  userId,
  userName,
  currentRole,
  triggerLabel,
  disabled = false,
}: UserRoleChangeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(currentRole);
  const [confirming, setConfirming] = useState(false);

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirming(false);
      setError(null);
      setNewRole(currentRole);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await changeUserRole({ userId, newRole });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    reset(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        {triggerLabel ? (
          <Button variant="outline" size="sm" disabled={disabled}>
            {triggerLabel}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={disabled}
            aria-label={`Change role for ${userName}`}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirming ? "Confirm role change" : "Change user role"}</DialogTitle>
          <DialogDescription>
            {confirming
              ? `Change ${userName} from ${currentRole} to ${newRole}? This takes effect on their next page load and is recorded in the audit log.`
              : `Change the role for ${userName}. Current role: ${currentRole}.`}
          </DialogDescription>
        </DialogHeader>

        {!confirming ? (
          <div className="space-y-2">
            <Label htmlFor={`role-${userId}`}>New role</Label>
            <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRole)}>
              <SelectTrigger id={`role-${userId}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{roleHelp[newRole]}</p>
          </div>
        ) : (
          newRole === "admin" && (
            <p className="text-sm text-destructive">
              Admins can see and change everything on the platform.
            </p>
          )
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          {confirming ? (
            <>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change to {newRole}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button onClick={() => setConfirming(true)} disabled={newRole === currentRole}>
                Continue
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

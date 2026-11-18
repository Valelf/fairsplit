"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteProperty, updateProperty } from "@/lib/actions/properties";
import type { Property } from "@/lib/supabase/types";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type EditableProperty = Pick<
  Property,
  "id" | "name" | "address_line1" | "address_line2" | "city" | "state" | "zip_code" | "transparency_level"
>;

/** Edit + delete controls for the property overview header. */
export function PropertySettings({ property }: { property: EditableProperty }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transparency, setTransparency] = useState(property.transparency_level);
  const [confirmName, setConfirmName] = useState("");

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const result = await updateProperty(property.id, {
      name: String(f.get("name") ?? ""),
      address_line1: String(f.get("address_line1") ?? ""),
      address_line2: String(f.get("address_line2") ?? "") || null,
      city: String(f.get("city") ?? ""),
      state: String(f.get("state") ?? ""),
      zip_code: String(f.get("zip_code") ?? ""),
      transparency_level: transparency,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit property
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => {
          setConfirmName("");
          setDeleteOpen(true);
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={(o) => !loading && setEditOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit property</DialogTitle>
            <DialogDescription>Name, address and what tenants can see.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prop-name">Name</Label>
              <Input id="prop-name" name="name" defaultValue={property.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-addr1">Address</Label>
              <Input id="prop-addr1" name="address_line1" defaultValue={property.address_line1} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-addr2">Address line 2 (optional)</Label>
              <Input id="prop-addr2" name="address_line2" defaultValue={property.address_line2 ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="prop-city">City</Label>
                <Input id="prop-city" name="city" defaultValue={property.city} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-state">State</Label>
                <Input id="prop-state" name="state" defaultValue={property.state} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prop-zip">ZIP</Label>
                <Input id="prop-zip" name="zip_code" defaultValue={property.zip_code} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prop-transparency">Tenants can see</Label>
              <Select
                value={transparency}
                onValueChange={(v) => setTransparency(v as EditableProperty["transparency_level"])}
              >
                <SelectTrigger id="prop-transparency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Everyone&apos;s shares</SelectItem>
                  <SelectItem value="own_share">Only their own share</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${property.name}?`}
        description="The property, its tenants and bills will be hidden from you and your tenants. This can only be undone by an admin."
        confirmLabel="Delete property"
        destructive
        confirmDisabled={confirmName.trim() !== property.name.trim()}
        onConfirm={async () => {
          const result = await deleteProperty(property.id, confirmName);
          if (result.error) return result.error;
          router.push("/dashboard/owner/properties");
          router.refresh();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="confirm-property-name">
            Type <span className="font-semibold">{property.name}</span> to confirm
          </Label>
          <Input
            id="confirm-property-name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

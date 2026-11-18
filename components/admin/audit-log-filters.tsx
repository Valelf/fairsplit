"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

interface AuditLogFiltersProps {
  actions: { value: string; label: string }[];
  actors: { value: string; label: string }[];
}

export function AuditLogFilters({ actions, actors }: AuditLogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const action = searchParams.get("action") ?? ALL;
  const actor = searchParams.get("actor") ?? ALL;

  function update(key: "action" | "actor", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="space-y-2 sm:w-56">
        <Label htmlFor="audit-action">Action</Label>
        <Select value={action} onValueChange={(v) => update("action", v)}>
          <SelectTrigger id="audit-action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 sm:w-64">
        <Label htmlFor="audit-actor">Actor</Label>
        <Select value={actor} onValueChange={(v) => update("actor", v)}>
          <SelectTrigger id="audit-actor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Anyone</SelectItem>
            {actors.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(action !== ALL || actor !== ALL) && (
        <Button variant="ghost" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

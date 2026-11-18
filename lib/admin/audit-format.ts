import type { AuditLogEntry } from "@/lib/supabase/types";
import { COMP_FOREVER } from "@/lib/admin/comp";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  change_role: "Changed role",
  extend_comp: "Updated comp",
  end_comp: "Ended comp",
  grant_plan: "Granted plan",
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function compText(v: unknown): string {
  const s = str(v);
  if (!s) return "not comped";
  if (s === COMP_FOREVER) return "no end date";
  return s;
}

/** The user the entry is about (profile id), when it can be worked out. */
export function auditSubjectUserId(entry: AuditLogEntry): string | null {
  if (entry.table_name === "profiles") return entry.record_id;
  return str(entry.new_data?.user_id) ?? str(entry.old_data?.user_id);
}

/** A one-line, human-readable description of what changed. */
export function describeAuditEntry(entry: AuditLogEntry): string {
  const o = entry.old_data ?? {};
  const n = entry.new_data ?? {};
  switch (entry.action) {
    case "change_role":
      return `${String(o.role ?? "?")} → ${String(n.role ?? "?")}`;
    case "extend_comp":
    case "end_comp": {
      const note = str(n.comp_note);
      return `Free until: ${compText(o.comp_until)} → ${compText(n.comp_until)}${note ? ` · “${note}”` : ""}`;
    }
    case "grant_plan": {
      const note = str(n.comp_note);
      return `${String(n.plan ?? "Plan")}, free until ${compText(n.comp_until)}${note ? ` · “${note}”` : ""}`;
    }
    default: {
      const keys = Object.keys(n).filter((k) => JSON.stringify(o[k]) !== JSON.stringify(n[k]));
      if (keys.length === 0) return entry.record_id ? `Record ${entry.record_id.slice(0, 8)}` : "";
      return keys
        .slice(0, 4)
        .map((k) => `${k}: ${o[k] === undefined ? "" : `${JSON.stringify(o[k])} → `}${JSON.stringify(n[k])}`)
        .join(", ");
    }
  }
}

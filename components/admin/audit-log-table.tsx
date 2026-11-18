import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { ScrollText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AuditLogEntry } from "@/lib/supabase/types";
import { auditActionLabel, auditSubjectUserId, describeAuditEntry } from "@/lib/admin/audit-format";

export type AuditPerson = { id: string; full_name: string; email: string };

interface AuditLogTableProps {
  entries: AuditLogEntry[];
  /** Profiles keyed by id, used to show actor and subject names. */
  people?: Record<string, AuditPerson>;
  emptyMessage?: string;
  showSubject?: boolean;
}

const actionColors: Record<string, BadgeProps["variant"]> = {
  change_role: "info",
  grant_plan: "success",
  extend_comp: "success",
  end_comp: "warning",
  create: "success",
  update: "secondary",
  delete: "danger",
};

function PersonLink({ id, people }: { id: string | null; people?: Record<string, AuditPerson> }) {
  if (!id) return <span className="text-muted-foreground">System</span>;
  const p = people?.[id];
  return (
    <Link
      href={`/dashboard/admin/users/${id}`}
      className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {p?.full_name || p?.email || `${id.slice(0, 8)}…`}
    </Link>
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function AuditLogTable({
  entries,
  people,
  emptyMessage = "No audit log entries found.",
  showSubject = true,
}: AuditLogTableProps) {
  if (entries.length === 0) {
    return <EmptyPanel icon={ScrollText} title={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            {showSubject && <TableHead>Subject</TableHead>}
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const subject = auditSubjectUserId(entry);
            return (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="text-sm">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </div>
                  <div className="figure text-xs text-muted-foreground">{formatTimestamp(entry.created_at)}</div>
                </TableCell>
                <TableCell>
                  <PersonLink id={entry.user_id} people={people} />
                </TableCell>
                <TableCell>
                  <Badge variant={actionColors[entry.action] || "outline"}>{auditActionLabel(entry.action)}</Badge>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{entry.table_name}</div>
                </TableCell>
                {showSubject && (
                  <TableCell>{subject ? <PersonLink id={subject} people={people} /> : "—"}</TableCell>
                )}
                <TableCell className="min-w-[14rem] max-w-md text-sm">{describeAuditEntry(entry)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

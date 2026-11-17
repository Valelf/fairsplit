import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { AuditLogEntry } from "@/lib/supabase/types";

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

const actionColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  change_role: "default",
  create: "secondary",
  update: "outline",
  delete: "destructive",
};

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No audit log entries found.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Action</TableHead>
          <TableHead>Table</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <Badge variant={actionColors[entry.action] || "outline"}>
                {entry.action}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {entry.table_name}
            </TableCell>
            <TableCell>
              {entry.old_data && entry.new_data ? (
                <div className="text-sm">
                  {entry.old_data.email ? (
                    <span className="text-muted-foreground">
                      {String(entry.old_data.email)}:{" "}
                    </span>
                  ) : null}
                  {entry.old_data.role ? (
                    <span>
                      {String(entry.old_data.role)} &rarr;{" "}
                      {String(entry.new_data.role)}
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {entry.record_id?.slice(0, 8)}...
                </span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(entry.created_at), {
                addSuffix: true,
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

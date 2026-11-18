import * as React from "react";
import { Column, Row, Section, Text } from "@react-email/components";
import { formatCents, formatDate } from "@/lib/utils";
import { describeShareMath, type ShareLineInput, type TenantNotificationKind } from "@/lib/notifications/schedule";
import {
  colors,
  CtaButton,
  EmailLayout,
  Heading1,
  numeric,
  Paragraph,
  PaymentHandlesBlock,
  type PaymentHandles,
} from "./layout";

export interface CycleBillEmailProps {
  kind: TenantNotificationKind;
  tenantName: string;
  propertyName: string;
  cycleLabel: string;
  dueDate: string | null;
  lines: ShareLineInput[];
  /** What the tenant still owes (reminders) or their full share (cycle_ready). */
  amountDueCents: number;
  handles: PaymentHandles | null;
  cycleUrl: string;
}

const categoryLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

export function cycleBillSubject(p: Pick<CycleBillEmailProps, "kind" | "cycleLabel" | "amountDueCents" | "dueDate">) {
  const amount = formatCents(p.amountDueCents);
  const due = p.dueDate ? formatDate(p.dueDate) : null;
  switch (p.kind) {
    case "cycle_ready":
      return `Your ${p.cycleLabel} utilities are ready: ${amount}${due ? ` due ${due}` : ""}`;
    case "due_soon":
      return `Reminder: ${amount} for ${p.cycleLabel} utilities is due ${due ?? "soon"}`;
    case "overdue":
      return `Overdue: ${amount} for ${p.cycleLabel} utilities was due ${due ?? "already"}`;
  }
}

function intro(p: CycleBillEmailProps): string {
  const due = p.dueDate ? formatDate(p.dueDate) : null;
  switch (p.kind) {
    case "cycle_ready":
      return `Your share of the ${p.cycleLabel} utilities for ${p.propertyName} is ready.${due ? ` Please pay by ${due}.` : ""}`;
    case "due_soon":
      return `A friendly reminder: your ${p.cycleLabel} utilities for ${p.propertyName} are due ${due ?? "soon"}.`;
    case "overdue":
      return `Your ${p.cycleLabel} utilities for ${p.propertyName} were due ${due ?? "already"} and still show as unpaid.`;
  }
}

export function CycleBillEmail(p: CycleBillEmailProps) {
  const heading =
    p.kind === "cycle_ready"
      ? `${formatCents(p.amountDueCents)} due${p.dueDate ? ` ${formatDate(p.dueDate)}` : ""}`
      : p.kind === "due_soon"
        ? `${formatCents(p.amountDueCents)} due ${p.dueDate ? formatDate(p.dueDate) : "soon"}`
        : `${formatCents(p.amountDueCents)} overdue`;
  const shareTotal = p.lines.reduce((s, l) => s + l.shareCents, 0);

  return (
    <EmailLayout preview={cycleBillSubject(p)}>
      <Heading1>{heading}</Heading1>
      <Paragraph>Hi {p.tenantName},</Paragraph>
      <Paragraph>{intro(p)}</Paragraph>

      <Section style={{ margin: "16px 0" }}>
        {p.lines.map((line, i) => (
          <Row key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
            <Column style={{ padding: "10px 8px 10px 0", verticalAlign: "top" }}>
              <Text style={{ fontSize: "15px", lineHeight: "20px", margin: 0, fontWeight: 600 }}>
                {categoryLabel(line.category)}
                <span style={{ fontWeight: 400, color: colors.muted }}> · {line.provider}</span>
              </Text>
              <Text style={{ fontSize: "13px", lineHeight: "18px", margin: "2px 0 0", color: colors.muted, fontVariantNumeric: "tabular-nums" }}>
                {describeShareMath(line, formatCents)}
              </Text>
            </Column>
            <Column style={{ ...numeric, padding: "10px 0", verticalAlign: "top", width: "96px" }}>
              <Text style={{ fontSize: "15px", lineHeight: "20px", margin: 0, ...numeric }}>
                {formatCents(line.shareCents)}
              </Text>
            </Column>
          </Row>
        ))}
        <Row>
          <Column style={{ padding: "12px 8px 0 0" }}>
            <Text style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Your total</Text>
          </Column>
          <Column style={{ ...numeric, padding: "12px 0 0", width: "96px" }}>
            <Text style={{ fontSize: "15px", fontWeight: 700, margin: 0, ...numeric }}>
              {formatCents(shareTotal)}
            </Text>
          </Column>
        </Row>
        {p.amountDueCents !== shareTotal && (
          <Row>
            <Column style={{ padding: "4px 8px 0 0" }}>
              <Text style={{ fontSize: "14px", margin: 0, color: colors.warn }}>Still owed</Text>
            </Column>
            <Column style={{ ...numeric, padding: "4px 0 0", width: "96px" }}>
              <Text style={{ fontSize: "14px", margin: 0, color: colors.warn, ...numeric }}>
                {formatCents(p.amountDueCents)}
              </Text>
            </Column>
          </Row>
        )}
      </Section>

      <Paragraph muted>
        Each bill is split by person-days: the days each person lived in the house during the
        bill&apos;s service period.
      </Paragraph>

      <PaymentHandlesBlock handles={p.handles} />

      <CtaButton href={p.cycleUrl}>View your bill</CtaButton>
      <Paragraph muted>Paid already? Tap &quot;I&apos;ve paid&quot; on the bill page so your landlord can confirm it.</Paragraph>
    </EmailLayout>
  );
}

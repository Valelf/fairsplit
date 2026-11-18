import * as React from "react";
import { Column, Row, Section, Text } from "@react-email/components";
import { formatCents } from "@/lib/utils";
import { colors, CtaButton, EmailLayout, Heading1, numeric, Paragraph } from "./layout";

export interface OwnerDigestItem {
  tenantName: string;
  propertyName: string;
  cycleLabel: string;
  amountCents: number;
  note: string | null;
}

export interface OwnerDigestEmailProps {
  ownerName: string;
  items: OwnerDigestItem[];
  paymentsUrl: string;
}

export function ownerDigestSubject(p: OwnerDigestEmailProps) {
  const total = p.items.reduce((s, i) => s + i.amountCents, 0);
  const n = p.items.length;
  return `${n} payment${n === 1 ? "" : "s"} to confirm (${formatCents(total)})`;
}

export function OwnerDigestEmail(p: OwnerDigestEmailProps) {
  return (
    <EmailLayout
      preview={ownerDigestSubject(p)}
      footer="You get this daily digest only on days when tenants mark payments as paid. FairSplit never handles money."
    >
      <Heading1>Payments to confirm</Heading1>
      <Paragraph>Hi {p.ownerName},</Paragraph>
      <Paragraph>
        These tenants say they&apos;ve paid. Check your Venmo, Zelle or bank, then confirm each one in
        FairSplit.
      </Paragraph>
      <Section style={{ margin: "16px 0" }}>
        {p.items.map((item, i) => (
          <Row key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
            <Column style={{ padding: "10px 8px 10px 0", verticalAlign: "top" }}>
              <Text style={{ fontSize: "15px", lineHeight: "20px", margin: 0, fontWeight: 600 }}>
                {item.tenantName}
              </Text>
              <Text style={{ fontSize: "13px", lineHeight: "18px", margin: "2px 0 0", color: colors.muted }}>
                {item.propertyName} · {item.cycleLabel}
                {item.note ? ` · “${item.note}”` : ""}
              </Text>
            </Column>
            <Column style={{ ...numeric, padding: "10px 0", verticalAlign: "top", width: "96px" }}>
              <Text style={{ fontSize: "15px", margin: 0, ...numeric }}>{formatCents(item.amountCents)}</Text>
            </Column>
          </Row>
        ))}
      </Section>
      <CtaButton href={p.paymentsUrl}>Review payments</CtaButton>
    </EmailLayout>
  );
}

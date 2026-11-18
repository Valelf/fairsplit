import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** Shared plain, mobile-friendly email shell. Inline styles only (email clients ignore classes). */

export const colors = {
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  accent: "#18181b",
  warn: "#b45309",
};

export const numeric: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
  whiteSpace: "nowrap",
  textAlign: "right",
};

export function EmailLayout({
  preview,
  children,
  footer,
}: {
  preview: string;
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#ffffff",
          color: colors.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container style={{ maxWidth: "560px", width: "100%", padding: "0 16px" }}>
          <Text style={{ fontSize: "14px", fontWeight: 600, color: colors.muted, margin: "0 0 16px" }}>
            FairSplit
          </Text>
          {children}
          <Hr style={{ borderColor: colors.border, margin: "32px 0 16px" }} />
          <Text style={{ fontSize: "12px", lineHeight: "18px", color: colors.muted, margin: 0 }}>
            {footer ??
              "FairSplit splits shared utility bills by the days each person lived there. FairSplit never handles money: pay your landlord directly."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Heading1({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: "22px", lineHeight: "30px", fontWeight: 700, margin: "0 0 12px" }}>
      {children}
    </Text>
  );
}

export function Paragraph({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <Text
      style={{
        fontSize: "15px",
        lineHeight: "22px",
        margin: "0 0 12px",
        color: muted ? colors.muted : colors.text,
      }}
    >
      {children}
    </Text>
  );
}

export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.accent,
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 600,
          padding: "12px 20px",
          borderRadius: "6px",
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export interface PaymentHandles {
  payee_name: string | null;
  venmo_handle: string | null;
  cashapp_handle: string | null;
  zelle_contact: string | null;
  paypal_me: string | null;
  instructions: string | null;
}

export function paymentHandleLines(h: PaymentHandles | null): string[] {
  if (!h) return [];
  const lines: string[] = [];
  if (h.venmo_handle) lines.push(`Venmo: @${h.venmo_handle.replace(/^@/, "")}`);
  if (h.zelle_contact) lines.push(`Zelle: ${h.zelle_contact}`);
  if (h.cashapp_handle) lines.push(`Cash App: $${h.cashapp_handle.replace(/^\$/, "")}`);
  if (h.paypal_me) lines.push(`PayPal: paypal.me/${h.paypal_me.replace(/^.*paypal\.me\//i, "")}`);
  return lines;
}

export function PaymentHandlesBlock({ handles }: { handles: PaymentHandles | null }) {
  const lines = paymentHandleLines(handles);
  if (lines.length === 0 && !handles?.instructions) {
    return <Paragraph muted>Pay your landlord the way you usually do.</Paragraph>;
  }
  return (
    <Section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        padding: "12px 16px",
        margin: "16px 0",
      }}
    >
      <Text style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 6px" }}>
        How to pay{handles?.payee_name ? ` ${handles.payee_name}` : ""}
      </Text>
      {lines.map((line) => (
        <Text key={line} style={{ fontSize: "14px", lineHeight: "20px", margin: 0 }}>
          {line}
        </Text>
      ))}
      {handles?.instructions && (
        <Text style={{ fontSize: "13px", lineHeight: "19px", color: colors.muted, margin: "8px 0 0" }}>
          {handles.instructions}
        </Text>
      )}
    </Section>
  );
}

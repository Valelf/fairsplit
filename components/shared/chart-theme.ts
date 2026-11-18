/**
 * Shared recharts styling, read from the design tokens so charts follow
 * light/dark mode. Numbers use the mono figure face, labels the body face.
 */
import type { CSSProperties } from "react";

export const chartFont = {
  sans: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
  mono: "var(--font-mono), ui-monospace, monospace",
};

/** Series colours: teal, blue, amber, red, slate. All tokens, all themed. */
export const chartSeries = [
  "hsl(var(--primary))",
  "hsl(var(--info-soft-foreground))",
  "hsl(var(--warning-soft-foreground))",
  "hsl(var(--danger-soft-foreground))",
  "hsl(var(--muted-foreground))",
];

export const chartGridStroke = "hsl(var(--border))";

/** Category-axis ticks (month names). */
export const chartCategoryTick = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 12,
  fontFamily: chartFont.sans,
};

/** Value-axis ticks (money, counts). */
export const chartValueTick = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: chartFont.mono,
};

export const chartTooltipStyle: CSSProperties = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))",
  fontFamily: chartFont.sans,
  fontSize: 12,
  boxShadow: "none",
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "hsl(var(--popover-foreground))",
  fontFamily: chartFont.mono,
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "hsl(var(--muted-foreground))",
  marginBottom: 2,
};

export const chartLegendStyle: CSSProperties = {
  fontFamily: chartFont.sans,
  fontSize: 12,
  color: "hsl(var(--muted-foreground))",
};

export const formatDollars = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const formatDollarsExact = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

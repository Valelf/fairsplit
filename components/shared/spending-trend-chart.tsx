"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartFrame } from "@/components/shared/chart-frame";
import type { MonthlyTotal } from "@/lib/queries/analytics";
import {
  chartCategoryTick,
  chartGridStroke,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  chartValueTick,
  formatDollars,
  formatDollarsExact,
} from "@/components/shared/chart-theme";

interface SpendingTrendChartProps {
  data: MonthlyTotal[];
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    amount: d.totalCents / 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No spending data yet
      </div>
    );
  }

  return (
    <ChartFrame label="Monthly spending trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
          <XAxis
            dataKey="name"
            tick={chartCategoryTick}
            tickLine={false}
            axisLine={{ stroke: chartGridStroke }}
            minTickGap={12}
          />
          <YAxis
            tick={chartValueTick}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={formatDollars}
          />
          <Tooltip
            formatter={(value) => [formatDollarsExact(Number(value)), "Total"]}
            contentStyle={chartTooltipStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
            cursor={{ stroke: chartGridStroke }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: "hsl(var(--primary))", r: 3 }}
            activeDot={{ r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

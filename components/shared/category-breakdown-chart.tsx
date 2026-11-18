"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CategoryBreakdown } from "@/lib/queries/analytics";
import {
  chartLegendStyle,
  chartSeries,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
  formatDollarsExact,
} from "@/components/shared/chart-theme";

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[];
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const chartData = data.map((d) => ({
    name: d.category.charAt(0).toUpperCase() + d.category.slice(1),
    value: d.totalCents / 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No category data yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            stroke="hsl(var(--card))"
            strokeWidth={2}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={chartSeries[index % chartSeries.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [formatDollarsExact(Number(value)), name]}
            contentStyle={chartTooltipStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={chartLegendStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

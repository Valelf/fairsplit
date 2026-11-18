"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartFrame, CHART_INITIAL_DIMENSION } from "@/components/shared/chart-frame";
import type { UserGrowthPoint } from "@/lib/queries/analytics";
import { EmptyPanel } from "@/components/shared/empty-panel";
import { Users } from "lucide-react";

interface UserGrowthChartProps {
  data: UserGrowthPoint[];
}

const tick = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
};

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    Owners: d.owners,
    Tenants: d.tenants,
  }));

  if (chartData.length === 0) {
    return (
      <EmptyPanel
        icon={Users}
        title="No sign-ups yet"
        description="Monthly owner and tenant sign-ups will chart here."
        className="h-[260px] justify-center"
      />
    );
  }

  return (
    <ChartFrame className="h-[260px] sm:h-[260px]" label="Monthly owner and tenant sign-ups">
    <ResponsiveContainer width="100%" height="100%" initialDimension={CHART_INITIAL_DIMENSION}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={tick}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--popover-foreground))",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--popover-foreground))", fontWeight: 500 }}
          itemStyle={{ fontFamily: "var(--font-mono)", color: "hsl(var(--popover-foreground))" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
        />
        <Bar dataKey="Owners" stackId="a" fill="hsl(var(--primary))" />
        <Bar
          dataKey="Tenants"
          stackId="a"
          fill="hsl(var(--info-soft-foreground))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
    </ChartFrame>
  );
}

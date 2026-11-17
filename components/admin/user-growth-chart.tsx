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
import type { UserGrowthPoint } from "@/lib/queries/analytics";

interface UserGrowthChartProps {
  data: UserGrowthPoint[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    Owners: d.owners,
    Tenants: d.tenants,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
        No user data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar
          dataKey="Owners"
          stackId="a"
          fill="hsl(var(--primary))"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Tenants"
          stackId="a"
          fill="hsl(var(--chart-2, 200 70% 50%))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

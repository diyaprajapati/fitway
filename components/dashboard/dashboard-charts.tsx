"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const membershipChartConfig = {
  value: {
    label: "Memberships",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatInr(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(n);
}

type Props = {
  dailyRevenue: { date: string; label: string; revenue: number }[];
  membershipBars: {
    key: string;
    label: string;
    value: number;
    fillVar: string;
  }[];
};

export function DashboardCharts({ dailyRevenue, membershipBars }: Props) {
  const hasRevenue = React.useMemo(
    () => dailyRevenue.some((d) => d.revenue > 0),
    [dailyRevenue],
  );

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Payments recorded per day (last 14 days)</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {!hasRevenue ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments in the last 14 days.
            </p>
          ) : (
            <ChartContainer config={revenueChartConfig} className="h-[220px] w-full">
              <AreaChart accessibilityLayer data={dailyRevenue} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={44}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => (typeof v === "number" && v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="tabular-nums">
                          {typeof value === "number" ? formatInr(value) : String(value)}
                        </span>
                      )}
                    />
                  }
                />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="var(--color-revenue)"
                  fillOpacity={0.35}
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memberships</CardTitle>
          <CardDescription>By end date — expired, expiring within 7 days, or active beyond 7 days</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <ChartContainer config={membershipChartConfig} className="h-[220px] w-full">
            <BarChart
              accessibilityLayer
              data={membershipBars}
              layout="vertical"
              margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={88}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) => <span className="tabular-nums">{String(value)}</span>}
                  />
                }
              />
              <Bar dataKey="value" radius={6}>
                {membershipBars.map((row) => (
                  <Cell key={row.key} fill={`var(${row.fillVar})`} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

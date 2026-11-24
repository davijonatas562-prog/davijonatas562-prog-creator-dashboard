"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DailyMetric } from "@/lib/types";
import { formatCompact } from "@/lib/utils";

type MetricKey = "views" | "saves" | "follows";
const labels: Record<MetricKey, string> = { views: "Views", saves: "Saves", follows: "Follows" };

export function ViewsChart({ data }: { data: DailyMetric[] }) {
  const [metric, setMetric] = useState<MetricKey>("views");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos 30 dias</CardTitle>
        <CardDescription>Instagram · por dia</CardDescription>
        <CardAction>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
            <TabsList>
              {(Object.keys(labels) as MetricKey[]).map((k) => (
                <TabsTrigger key={k} value={k}>{labels[k]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="h-64 px-2 sm:px-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              itemStyle={{ color: "var(--foreground)" }}
              labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              formatter={(v) => [Number(v).toLocaleString("pt-BR"), labels[metric]]}
            />
            <Area type="monotone" dataKey={metric} stroke="var(--chart-1)" strokeWidth={2} fill="url(#fill)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelinePoint } from "@/lib/metrics/dashboard";
import { bucketLabel, bucketLabelLong } from "./format";

const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = { stroke: "var(--border)", strokeDasharray: "0", vertical: false, strokeOpacity: 0.6 } as const;

type TipRow = { label: string; value: string; color: string };

function TooltipBox({ title, rows }: { title: string; rows: TipRow[] }) {
  return (
    <div className="min-w-40 rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-2xl backdrop-blur">
      <p className="mb-1.5 font-medium capitalize text-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-sm" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-medium tabular-nums text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}

function pointOf(active: boolean | undefined, payload: TipProps["payload"]) {
  return active ? (payload?.[0]?.payload as TimelinePoint | undefined) : undefined;
}

export function MentionsVolumeChart({ data, bucket }: { data: TimelinePoint[]; bucket: "hour" | "day" }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="t" tickFormatter={(t) => bucketLabel(t, bucket)} minTickGap={24} {...AXIS} />
        <YAxis allowDecimals={false} width={44} {...AXIS} />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          content={({ active, payload }: TipProps) =>
{
            const p = pointOf(active, payload);
            return p ? (
              <TooltipBox
                title={bucketLabelLong(p.t, bucket) + (p.t === data[data.length - 1]?.t ? " · em andamento" : "")}
                rows={[{ label: "Menções", value: p.total.toLocaleString("pt-BR"), color: "var(--primary)" }]}
              />
            ) : null;
          }}
        />
        <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} fill="url(#vol)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SentimentTrendChart({ data, bucket }: { data: TimelinePoint[]; bucket: "hour" | "day" }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="t" tickFormatter={(t) => bucketLabel(t, bucket)} minTickGap={24} {...AXIS} />
        <YAxis domain={[-100, 100]} ticks={[-100, -50, 0, 50, 100]} width={44} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`} {...AXIS} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
        <Tooltip
          cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
          content={({ active, payload }: TipProps) => {
            const p = pointOf(active, payload);
            if (!p) return null;
            return (
              <TooltipBox
                title={bucketLabelLong(p.t, bucket) + (p.t === data[data.length - 1]?.t ? " · em andamento" : "")}
                rows={[
                  {
                    label: "Saldo de sentimento",
                    value: p.net === null ? "poucos dados" : `${p.net > 0 ? "+" : ""}${p.net.toFixed(0)} p.p.`,
                    color: "var(--info)",
                  },
                  { label: "Positivas", value: String(p.positive), color: "var(--sent-positive)" },
                  { label: "Negativas", value: String(p.negative), color: "var(--sent-negative)" },
                ]}
              />
            );
          }}
        />
        <Line type="monotone" dataKey="net" stroke="var(--info)" strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PositiveNegativeChart({ data, bucket }: { data: TimelinePoint[]; bucket: "hour" | "day" }) {
  const rows = data.map((d) => ({ ...d, neg: -d.negative }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} stackOffset="sign" barCategoryGap="22%">
        <CartesianGrid {...GRID} />
        <XAxis dataKey="t" tickFormatter={(t) => bucketLabel(t, bucket)} minTickGap={24} {...AXIS} />
        <YAxis width={44} tickFormatter={(v) => String(Math.abs(v))} allowDecimals={false} {...AXIS} />
        <ReferenceLine y={0} stroke="var(--border)" />
        <Tooltip
          cursor={{ fill: "var(--accent)", opacity: 0.5 }}
          content={({ active, payload }: TipProps) => {
            const p = pointOf(active, payload);
            if (!p) return null;
            return (
              <TooltipBox
                title={bucketLabelLong(p.t, bucket) + (p.t === data[data.length - 1]?.t ? " · em andamento" : "")}
                rows={[
                  { label: "Positivas", value: String(p.positive), color: "var(--sent-positive)" },
                  { label: "Negativas", value: String(p.negative), color: "var(--sent-negative)" },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="positive" stackId="s" fill="var(--sent-positive)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="neg" stackId="s" fill="var(--sent-negative)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

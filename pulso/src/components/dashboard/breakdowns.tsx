"use client";

import * as React from "react";
import { ExternalLink, Flame, LinkIcon } from "lucide-react";
import type { DashboardData } from "@/lib/metrics/dashboard";
import { sourceName } from "@/lib/connectors/catalog";
import { SENTIMENT_LABEL } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatCompact, formatPct } from "@/lib/utils";
import { ChartEmpty } from "./chart-card";
import { dateTime, SENTIMENT_STYLE } from "./format";

/** Distribuição por rede: barras horizontais de um único tom (magnitude). */
export function NetworkBars({ networks }: { networks: DashboardData["networks"] }) {
  if (!networks.length) return <ChartEmpty />;
  const max = Math.max(...networks.map((n) => n.count));
  return (
    <ul className="grid gap-3">
      {networks.map((n) => (
        <li key={n.sourceId} className="group grid grid-cols-[88px_1fr_64px] items-center gap-3 text-xs" title={`${sourceName(n.sourceId)}: ${n.count} menções`}>
          <span className="truncate text-muted-foreground group-hover:text-foreground">{sourceName(n.sourceId)}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary/85 transition-[width] duration-700 ease-out group-hover:bg-primary"
              style={{ width: `${(n.count / max) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums">
            <span className="font-medium">{n.count.toLocaleString("pt-BR")}</span>
            <span className="ml-1 text-muted-foreground">{Math.round(n.share * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Assuntos: barra segmentada por sentimento com 2px de respiro entre segmentos. */
export function TopicBars({ topics }: { topics: DashboardData["topics"] }) {
  const [hover, setHover] = React.useState<string | null>(null);
  if (!topics.length) return <ChartEmpty message="Nenhum assunto identificado no período." />;
  const max = Math.max(...topics.map((t) => t.count));
  return (
    <ul className="grid gap-3.5">
      {topics.map((t) => {
        const segs = [
          { k: "positive", v: t.positive, c: "bg-sent-positive" },
          { k: "neutral", v: t.neutral, c: "bg-sent-neutral" },
          { k: "other", v: t.other, c: "bg-sent-mixed" },
          { k: "negative", v: t.negative, c: "bg-sent-negative" },
        ].filter((s) => s.v > 0);
        return (
          <li
            key={t.topic}
            className="relative grid grid-cols-[minmax(92px,140px)_1fr_44px] items-center gap-3 text-xs"
            onMouseEnter={() => setHover(t.topic)}
            onMouseLeave={() => setHover(null)}
          >
            <span className={cn("truncate", hover === t.topic ? "text-foreground" : "text-muted-foreground")}>{t.topic}</span>
            <span className="flex h-2.5 gap-[2px]" style={{ width: `${(t.count / max) * 100}%` }}>
              {segs.map((s, i) => (
                <span
                  key={s.k}
                  className={cn("h-full", s.c, i === 0 && "rounded-l-full", i === segs.length - 1 && "rounded-r-full")}
                  style={{ flexGrow: s.v, flexBasis: 0 }}
                />
              ))}
            </span>
            <span className="text-right font-medium tabular-nums">{t.count}</span>
            {hover === t.topic && (
              <span className="pointer-events-none absolute left-[110px] top-5 z-10 rounded-lg border border-border bg-popover px-3 py-2 text-[11px] shadow-2xl">
                <span className="mb-1 block font-medium">{t.topic}</span>
                <span className="block text-positive">{t.positive} positivas</span>
                <span className="block text-muted-foreground">{t.neutral} neutras</span>
                <span className="block text-info">{t.other} mistas/indeterminadas</span>
                <span className="block text-negative">{t.negative} negativas</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Horários de maior atividade: grade dia × hora, rampa sequencial de um só tom. */
export function ActivityHeatmap({ heatmap }: { heatmap: number[][] }) {
  const [cell, setCell] = React.useState<{ d: number; h: number } | null>(null);
  const max = Math.max(1, ...heatmap.flat());
  const total = heatmap.flat().reduce((a, b) => a + b, 0);
  if (total === 0) return <ChartEmpty />;

  // pico
  let peak = { d: 0, h: 0, v: 0 };
  heatmap.forEach((row, d) => row.forEach((v, h) => v > peak.v && (peak = { d, h, v })));
  const byHour = Array.from({ length: 24 }, (_, h) => heatmap.reduce((s, r) => s + r[h], 0));
  const peakHour = byHour.indexOf(Math.max(...byHour));

  return (
    <div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[2px]">
            {heatmap.map((row, d) => (
              <React.Fragment key={d}>
                <span className="pr-1 text-right text-[10px] leading-[18px] text-muted-foreground">{WEEKDAYS[d]}</span>
                {row.map((v, h) => {
                  const level = v === 0 ? 0 : 0.12 + 0.88 * (v / max);
                  return (
                    <button
                      type="button"
                      key={h}
                      aria-label={`${WEEKDAYS[d]}, ${h}h: ${v} menções`}
                      onMouseEnter={() => setCell({ d, h })}
                      onMouseLeave={() => setCell(null)}
                      onFocus={() => setCell({ d, h })}
                      onBlur={() => setCell(null)}
                      className={cn("h-[18px] rounded-[3px] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring", v === 0 && "bg-muted/60")}
                      style={v ? { background: `color-mix(in oklab, var(--primary) ${Math.round(level * 100)}%, var(--muted))` } : undefined}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-[36px_repeat(24,minmax(0,1fr))] gap-[2px] text-[10px] text-muted-foreground">
            <span />
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="text-center">
                {h % 3 === 0 ? `${h}h` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p className="min-h-4">
          {cell ? (
            <>
              <span className="font-medium text-foreground">
                {WEEKDAYS[cell.d]}, {cell.h}h–{cell.h + 1}h
              </span>
              : {heatmap[cell.d][cell.h]} menções
            </>
          ) : (
            <>
              Pico: <span className="font-medium text-foreground">{WEEKDAYS[peak.d]} às {peak.h}h</span> · horário mais ativo em geral:{" "}
              <span className="font-medium text-foreground">{peakHour}h</span>
            </>
          )}
        </p>
        <span className="flex items-center gap-1.5">
          menos
          {[0.12, 0.4, 0.7, 1].map((l) => (
            <span key={l} className="size-2.5 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--primary) ${l * 100}%, var(--muted))` }} />
          ))}
          mais
        </span>
      </div>
    </div>
  );
}

export function TrendingTopics({ topics }: { topics: DashboardData["trendingTopics"] }) {
  if (!topics.length)
    return <p className="py-6 text-center text-xs text-muted-foreground">Nenhum assunto com crescimento relevante no período.</p>;
  return (
    <ul className="grid gap-2">
      {topics.map((t, i) => {
        const negShare = t.count ? t.negative / t.count : 0;
        return (
          <li key={t.topic} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5 transition-colors hover:border-muted-foreground/30">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-[11px] font-semibold text-primary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.topic}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.count} menções · {Math.round(negShare * 100)}% negativas
              </p>
            </div>
            <Badge variant={negShare >= 0.5 ? "negative" : "default"}>
              <Flame />
              {t.growth === null ? "novo" : formatPct(t.growth, { signed: true, digits: 0 })}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

export function Highlights({ items, mode }: { items: DashboardData["highlights"]; mode: "app" | "demo" }) {
  if (!items.length) return <ChartEmpty message="Nenhuma menção no período." />;
  return (
    <ul className="grid gap-3">
      {items.map((m) => {
        const s = m.sentiment ? SENTIMENT_STYLE[m.sentiment] : null;
        return (
          <li key={m.id} className="rounded-lg border border-border/70 bg-background/40 p-3 transition-colors hover:border-muted-foreground/30">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/90">{sourceName(m.sourceId)}</span>
              <span>·</span>
              <span>{dateTime(m.publishedAt)}</span>
              {m.sentiment && s && (
                <Badge variant={s.badge} className="ml-auto">
                  {SENTIMENT_LABEL[m.sentiment]}
                </Badge>
              )}
            </div>
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed">{m.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {m.topic && <span>{m.topic}</span>}
              {m.reach !== null && <span className="tabular-nums">alcance ~{formatCompact(m.reach)}</span>}
              {m.engagement !== null && <span className="tabular-nums">{formatCompact(m.engagement)} interações</span>}
              {m.url ? (
                <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                  Abrir original <ExternalLink className="size-3" />
                </a>
              ) : (
                <span className="ml-auto inline-flex items-center gap-1" title={mode === "demo" ? "Menção fictícia: não existe publicação original." : "A fonte não forneceu link."}>
                  <LinkIcon className="size-3" /> {mode === "demo" ? "sem link (fictícia)" : "link indisponível"}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import { APP_TZ_OFFSET_MINUTES } from "@/lib/env";

export type PeriodKey = "24h" | "7d" | "30d" | "custom";

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; short: string }[] = [
  { key: "24h", label: "Últimas 24 horas", short: "24h" },
  { key: "7d", label: "Últimos 7 dias", short: "7 dias" },
  { key: "30d", label: "Últimos 30 dias", short: "30 dias" },
  { key: "custom", label: "Personalizado", short: "Personalizado" },
];

export interface Period {
  key: PeriodKey;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  bucket: "hour" | "day";
  label: string;
  /** datas no formato YYYY-MM-DD (fuso local) para o seletor personalizado */
  from: string;
  to: string;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const OFFSET = APP_TZ_OFFSET_MINUTES * 60_000;
const MAX_CUSTOM_DAYS = 365;

/** Converte YYYY-MM-DD (fuso local do app) para o instante UTC de 00:00 local. */
function localDateToUtc(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]) - OFFSET;
  return Number.isNaN(t) ? null : new Date(t);
}

export function toLocalDateString(d: Date) {
  return new Date(d.getTime() + OFFSET).toISOString().slice(0, 10);
}

/** Início do dia local que contém `d`. */
export function startOfLocalDay(d: Date) {
  const local = d.getTime() + OFFSET;
  return new Date(local - (((local % DAY) + DAY) % DAY) - OFFSET);
}

export function resolvePeriod(params: { periodo?: string; de?: string; ate?: string }, now: Date): Period {
  const key: PeriodKey = (["24h", "7d", "30d", "custom"] as const).includes(params.periodo as PeriodKey)
    ? (params.periodo as PeriodKey)
    : "7d";

  let start: Date;
  let end: Date;
  if (key === "custom") {
    const from = params.de ? localDateToUtc(params.de) : null;
    const to = params.ate ? localDateToUtc(params.ate) : null;
    if (from && to && to >= from) {
      start = from;
      end = new Date(Math.min(to.getTime() + DAY, now.getTime()));
      if (end.getTime() - start.getTime() > MAX_CUSTOM_DAYS * DAY) start = new Date(end.getTime() - MAX_CUSTOM_DAYS * DAY);
      if (end <= start) end = new Date(start.getTime() + DAY);
    } else {
      // datas inválidas: cai para os últimos 7 dias
      end = now;
      start = new Date(now.getTime() - 7 * DAY);
    }
  } else {
    end = now;
    // 24h é janela móvel; 7 e 30 dias começam à meia-noite local, para que só o dia de hoje seja parcial
    start =
      key === "24h"
        ? new Date(now.getTime() - DAY)
        : new Date(startOfLocalDay(now).getTime() - ((key === "7d" ? 7 : 30) - 1) * DAY);
  }

  const len = end.getTime() - start.getTime();
  const bucket = len <= 2 * DAY ? "hour" : "day";
  const label =
    key === "custom"
      ? `${fmtDay(start)} – ${fmtDay(new Date(end.getTime() - 1))}`
      : PERIOD_OPTIONS.find((p) => p.key === key)!.label;

  return {
    key,
    start,
    end,
    prevStart: new Date(start.getTime() - len),
    prevEnd: start,
    bucket,
    label,
    from: toLocalDateString(start),
    to: toLocalDateString(new Date(end.getTime() - 1)),
  };
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Belem", day: "2-digit", month: "short" });
}

/** Bordas dos buckets do período (hora cheia ou dia local). */
export function bucketEdges(period: Period): Date[] {
  const step = period.bucket === "hour" ? HOUR : DAY;
  const first = period.bucket === "hour" ? new Date(Math.floor(period.start.getTime() / HOUR) * HOUR) : startOfLocalDay(period.start);
  const edges: Date[] = [];
  for (let t = first.getTime(); t < period.end.getTime(); t += step) edges.push(new Date(t));
  return edges;
}

export const MS = { HOUR, DAY, OFFSET };

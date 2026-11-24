import type { Sentiment } from "@/lib/types";

const TZ = "America/Belem";

export function bucketLabel(iso: string, bucket: "hour" | "day") {
  const d = new Date(iso);
  return bucket === "hour"
    ? d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit" }) + "h"
    : d.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
}

export function bucketLabelLong(iso: string, bucket: "hour" | "day") {
  const d = new Date(iso);
  return bucket === "hour"
    ? d.toLocaleString("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long" });
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(iso: string, now = Date.now()) {
  const diff = Math.round((now - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${diff} min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

export const SENTIMENT_STYLE: Record<Sentiment, { dot: string; text: string; badge: "positive" | "negative" | "muted" | "info" | "outline" }> = {
  positive: { dot: "bg-sent-positive", text: "text-positive", badge: "positive" },
  negative: { dot: "bg-sent-negative", text: "text-negative", badge: "negative" },
  neutral: { dot: "bg-sent-neutral", text: "text-muted-foreground", badge: "muted" },
  mixed: { dot: "bg-sent-mixed", text: "text-info", badge: "info" },
  undetermined: { dot: "bg-sent-undetermined", text: "text-muted-foreground", badge: "outline" },
};

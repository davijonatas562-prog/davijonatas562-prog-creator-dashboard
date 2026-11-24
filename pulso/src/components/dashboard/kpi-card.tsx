import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatPct, relativeChange } from "@/lib/utils";

/**
 * KPI com variação vs. período anterior. `goodWhen` define se subir é bom
 * (positivas), ruim (negativas) ou neutro (volume).
 */
export function KpiCard({
  label,
  value,
  current,
  previous,
  icon: Icon,
  goodWhen = "neutral",
  accentClass,
  footnote,
  deltaOverride,
  delay = 0,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  icon: LucideIcon;
  goodWhen?: "up" | "down" | "neutral";
  accentClass?: string;
  footnote?: string;
  deltaOverride?: { text: string; direction: "up" | "down" | "flat" } | null;
  delay?: number;
}) {
  const change = relativeChange(current, previous);
  const direction = deltaOverride?.direction ?? (change === null ? "up" : Math.abs(change) < 0.005 ? "flat" : change > 0 ? "up" : "down");
  const text = deltaOverride?.text ?? (change === null ? "novo" : formatPct(change, { signed: true }));
  const tone =
    direction === "flat" || goodWhen === "neutral"
      ? "text-muted-foreground bg-muted"
      : (direction === "up") === (goodWhen === "up")
        ? "text-positive bg-positive/10"
        : "text-negative bg-negative/10";
  const Arrow = direction === "flat" ? Minus : direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className="group relative min-w-0 overflow-hidden p-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 fill-mode-both hover:border-muted-foreground/25"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors", accentClass)}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        {deltaOverride === null ? (
          <span className="text-muted-foreground">sem base de comparação</span>
        ) : (
          <>
            <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium tabular-nums", tone)}>
              <Arrow className="size-3" />
              {text}
            </span>
            <span className="hidden text-muted-foreground sm:inline">vs. período anterior</span>
          </>
        )}
      </div>
      {footnote && <p className="mt-1.5 text-[11px] text-muted-foreground/80">{footnote}</p>}
    </Card>
  );
}

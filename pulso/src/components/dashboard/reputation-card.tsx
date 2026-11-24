"use client";

import { Info, TrendingDown, TrendingUp, MoveRight, CircleHelp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { DashboardData } from "@/lib/metrics/dashboard";
import { MIN_SAMPLE, TREND_LABEL, TREND_THRESHOLD, VOLUME_K } from "@/lib/metrics/reputation";
import { cn } from "@/lib/utils";

const R = 80;
const ARC = Math.PI * R; // comprimento do semicírculo

export function ReputationCard({
  rep,
  periodLabel,
  kpis,
}: {
  rep: DashboardData["reputation"];
  periodLabel: string;
  kpis: DashboardData["kpis"];
}) {
  const score = rep.score;
  const frac = score === null ? 0 : score / 100;
  const tone = score === null ? "text-muted-foreground" : score >= 60 ? "text-positive" : score <= 40 ? "text-negative" : "text-primary";
  const stroke = score === null ? "var(--border)" : score >= 60 ? "var(--positive)" : score <= 40 ? "var(--negative)" : "var(--primary)";

  const TrendIcon = rep.trend === "up" ? TrendingUp : rep.trend === "down" ? TrendingDown : rep.trend === "stable" ? MoveRight : CircleHelp;
  const trendVariant = rep.trend === "up" ? "positive" : rep.trend === "down" ? "negative" : rep.trend === "stable" ? "info" : "outline";

  return (
    <Card className="relative flex h-full flex-col overflow-hidden p-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 glow-primary opacity-70" aria-hidden />
      <div className="relative flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Pulso de Reputação</p>
          <p className="mt-1 text-xs text-muted-foreground/80">{periodLabel}</p>
        </div>
        <MethodologyDialog />
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-[260px]">
        <svg viewBox="0 0 200 118" className="w-full" role="img" aria-label={score === null ? "Índice indisponível" : `Índice ${score} de 100`}>
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${ARC * frac} ${ARC}`}
            className="transition-[stroke-dasharray] duration-1000 ease-out"
            style={{ filter: score === null ? undefined : `drop-shadow(0 0 10px color-mix(in oklab, ${stroke} 45%, transparent))` }}
          />
          <text x={20} y={114} textAnchor="middle" className="fill-muted-foreground text-[9px]">0</text>
          <text x={100} y={9} textAnchor="middle" className="fill-muted-foreground text-[9px]">50</text>
          <text x={180} y={114} textAnchor="middle" className="fill-muted-foreground text-[9px]">100</text>
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className={cn("text-5xl font-semibold tracking-tight tabular-nums", tone)}>{score ?? "—"}</span>
          <span className="text-[11px] text-muted-foreground">de 100</span>
        </div>
      </div>

      <div className="relative mt-4 flex flex-col items-center gap-2">
        <Badge variant={trendVariant} className="px-2.5 py-1 text-xs">
          <TrendIcon className="!size-3.5" />
          {TREND_LABEL[rep.trend]}
        </Badge>
        <p className="text-center text-xs text-muted-foreground">
          {rep.delta !== null && rep.previous !== null ? (
            <>
              {rep.delta > 0 ? "+" : ""}
              {rep.delta} pontos vs. período anterior ({rep.previous})
            </>
          ) : rep.trend === "insufficient" ? (
            <>São necessárias ao menos {MIN_SAMPLE} menções classificadas em cada período.</>
          ) : null}
        </p>
      </div>

      <Composition kpis={kpis} />

      <dl className="relative mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-muted-foreground">Base de cálculo</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{rep.sample.toLocaleString("pt-BR")} menções</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Confiança média</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{rep.avgConfidence === null ? "—" : `${Math.round(rep.avgConfidence * 100)}%`}</dd>
        </div>
      </dl>
      <p className="relative mt-3 flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
        <Info className="mt-px size-3 shrink-0" />
        Representa a percepção observada nas fontes monitoradas. Não é pesquisa eleitoral.
      </p>
    </Card>
  );
}

function MethodologyDialog() {
  return (
    <Dialog>
      <DialogTrigger className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        Metodologia
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Como o Pulso de Reputação é calculado</DialogTitle>
        <DialogDescription className="mt-1">
          Um índice de 0 a 100 que resume o saldo de sentimento das menções encontradas nas fontes monitoradas.
        </DialogDescription>
        <ol className="mt-5 grid gap-3 text-sm">
          {[
            ["Peso de cada menção", "confiança da classificação × relevância da fonte × peso temporal (menções recentes valem mais; o peso cai pela metade a cada meia duração do período)."],
            ["Valor do sentimento", "positiva = +1, negativa = −1, neutra e mista = 0. Indeterminadas e não classificadas ficam fora do cálculo."],
            ["Saldo ponderado (S)", "média ponderada dos valores, de −1 (só críticas) a +1 (só elogios)."],
            ["Fator de volume (k)", `k = n ÷ (n + ${VOLUME_K}). Com poucas menções, o índice é puxado para 50 para evitar conclusões fortes a partir de poucos dados.`],
            ["Resultado", "Pulso = 50 + 50 × S × k."],
            ["Tendência", `comparação com o período anterior de mesma duração: ±${TREND_THRESHOLD} pontos ou mais indica alta ou queda. Com menos de ${MIN_SAMPLE} menções classificadas, mostramos “dados insuficientes”.`],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">{i + 1}</span>
              <span>
                <strong className="font-medium">{t}:</strong> <span className="text-muted-foreground">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-warning">
          O índice reflete apenas o que foi publicado nas fontes conectadas. Não representa a opinião de toda a população, não
          substitui pesquisa de opinião e não deve ser divulgado como pesquisa eleitoral.
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Composição do sentimento no período — barra segmentada com rótulos diretos. */
function Composition({ kpis }: { kpis: DashboardData["kpis"] }) {
  const total = kpis.total.current;
  if (!total) return null;
  const parts = [
    { label: "Positivas", v: kpis.positive.current, c: "bg-sent-positive" },
    { label: "Neutras", v: kpis.neutral.current, c: "bg-sent-neutral" },
    { label: "Mistas", v: kpis.mixed.current, c: "bg-sent-mixed" },
    { label: "Indeterminadas", v: kpis.undetermined.current, c: "bg-sent-undetermined" },
    { label: "Negativas", v: kpis.negative.current, c: "bg-sent-negative" },
  ].filter((p) => p.v > 0);
  return (
    <div className="relative my-6">
      <p className="mb-2 text-xs text-muted-foreground">Composição das menções</p>
      <div className="flex h-2.5 gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label}: ${p.v}`).join(", ")}>
        {parts.map((p, i) => (
          <span
            key={p.label}
            title={`${p.label}: ${p.v} (${Math.round((p.v / total) * 100)}%)`}
            className={cn("h-full", p.c, i === 0 && "rounded-l-full", i === parts.length - 1 && "rounded-r-full")}
            style={{ flexGrow: p.v, flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-sm", p.c)} aria-hidden />
              {p.label}
            </span>
            <span className="font-medium tabular-nums">{Math.round((p.v / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

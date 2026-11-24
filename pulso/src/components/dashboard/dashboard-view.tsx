"use client";

import Link from "next/link";
import { Eye, Gauge, MessageSquareText, Minus, Smile, Frown, Sparkles, ArrowRight } from "lucide-react";
import type { DashboardData } from "@/lib/metrics/dashboard";
import type { MonitoredProfile, SourceStatus } from "@/lib/types";
import type { PeriodKey } from "@/lib/metrics/period";
import type { ActionResult } from "@/lib/action-result";
import { sourceName } from "@/lib/connectors/catalog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCompact, formatInt } from "@/lib/utils";
import { DashboardHeader, useDashboardNavigation } from "./dashboard-header";
import { KpiCard } from "./kpi-card";
import { ReputationCard } from "./reputation-card";
import { ChartCard, Legend } from "./chart-card";
import { MentionsVolumeChart, PositiveNegativeChart, SentimentTrendChart } from "./charts";
import { ActivityHeatmap, Highlights, NetworkBars, TopicBars, TrendingTopics } from "./breakdowns";
import { bucketLabelLong } from "./format";
import { DashboardSkeleton } from "./dashboard-skeleton";

export function DashboardView({
  mode,
  data,
  profiles,
  profileId,
  sources,
  lastUpdated,
  onRefresh,
  truncated = false,
}: {
  mode: "app" | "demo";
  data: DashboardData;
  profiles: MonitoredProfile[];
  profileId: string;
  sources: SourceStatus[];
  lastUpdated: string | null;
  onRefresh: () => Promise<ActionResult>;
  truncated?: boolean;
}) {
  const { navigate, pending } = useDashboardNavigation();
  const k = data.kpis;
  const bucket = data.period.bucket;
  const hasData = k.total.current > 0;
  const connected = sources.filter((s) => s.status === "connected").length;

  const sentDelta =
    data.netSentiment.current === null || data.netSentiment.previous === null
      ? null
      : data.netSentiment.current - data.netSentiment.previous;

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        profiles={profiles}
        profileId={profileId}
        periodKey={data.period.key as PeriodKey}
        from={data.period.from}
        to={data.period.to}
        sources={sources}
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        pending={pending}
        navigate={navigate}
      />

      {pending ? (
        <DashboardSkeleton withHeader={false} />
      ) : !hasData ? (
        <NoMentions mode={mode} connected={connected} periodLabel={data.period.label} />
      ) : (
        <>
          {truncated && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              O período tem mais menções do que o limite de leitura desta versão; os números consideram as 20 mil mais recentes.
            </p>
          )}

          <section className="grid gap-4 lg:grid-cols-12" aria-label="Indicadores principais">
            <div className="lg:col-span-4 lg:row-span-2">
              <ReputationCard rep={data.reputation} periodLabel={data.period.label} kpis={data.kpis} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-8">
              <KpiCard delay={40} label="Total de menções" value={formatInt(k.total.current)} current={k.total.current} previous={k.total.previous} icon={MessageSquareText} accentClass="group-hover:text-primary" />
              <KpiCard
                delay={80}
                label="Menções positivas"
                value={formatInt(k.positive.current)}
                current={k.positive.current}
                previous={k.positive.previous}
                icon={Smile}
                goodWhen="up"
                accentClass="text-positive bg-positive/10"
                footnote={`${pct(k.positive.current, k.total.current)} do total`}
              />
              <KpiCard
                delay={120}
                label="Menções negativas"
                value={formatInt(k.negative.current)}
                current={k.negative.current}
                previous={k.negative.previous}
                icon={Frown}
                goodWhen="down"
                accentClass="text-negative bg-negative/10"
                footnote={`${pct(k.negative.current, k.total.current)} do total`}
              />
              <KpiCard
                delay={160}
                label="Menções neutras"
                value={formatInt(k.neutral.current)}
                current={k.neutral.current}
                previous={k.neutral.previous}
                icon={Minus}
                footnote={`+ ${formatInt(k.mixed.current)} mistas · ${formatInt(k.undetermined.current)} indeterminadas`}
              />
              <KpiCard
                delay={200}
                label="Alcance estimado"
                value={formatCompact(k.reach.current)}
                current={k.reach.current}
                previous={k.reach.previous}
                icon={Eye}
                accentClass="text-info bg-info/10"
                footnote={`Informado em ${Math.round(k.reach.coverage * 100)}% das menções`}
              />
              <KpiCard
                delay={240}
                label="Variação de sentimento"
                value={data.netSentiment.current === null ? "—" : `${data.netSentiment.current > 0 ? "+" : ""}${data.netSentiment.current.toFixed(0)}`}
                current={0}
                previous={0}
                icon={Gauge}
                goodWhen="up"
                footnote="Saldo positivas − negativas (p.p.)"
                deltaOverride={
                  sentDelta === null
                    ? null
                    : {
                        text: `${sentDelta > 0 ? "+" : ""}${sentDelta.toFixed(1).replace(".", ",")} p.p.`,
                        direction: Math.abs(sentDelta) < 0.5 ? "flat" : sentDelta > 0 ? "up" : "down",
                      }
                }
              />
            </div>
            <Card className="lg:col-span-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
              <CardHeader className="flex-row items-center justify-between">
                <div className="grid gap-1">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" /> Assuntos em alta
                  </CardTitle>
                  <CardDescription>Maior crescimento vs. período anterior, com volume mínimo</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <TrendingTopics topics={data.trendingTopics} />
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-12">
            <ChartCard
              className="lg:col-span-8"
              title="Evolução das menções"
              description={`${bucket === "hour" ? "Menções por hora" : "Menções por dia"} · o último ponto ainda está em andamento`}
              table={{ columns: ["Período", "Menções"], rows: data.timeline.map((p) => [bucketLabelLong(p.t, bucket), p.total]) }}
            >
              <MentionsVolumeChart data={data.timeline} bucket={bucket} />
            </ChartCard>
            <ChartCard
              className="lg:col-span-4"
              title="Distribuição por rede"
              description="Participação de cada fonte"
              table={{ columns: ["Fonte", "Menções", "%"], rows: data.networks.map((n) => [sourceName(n.sourceId), n.count, `${Math.round(n.share * 100)}%`]) }}
              delay={60}
            >
              <NetworkBars networks={data.networks} />
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Evolução do sentimento"
              description="Saldo (positivas − negativas) ÷ menções classificadas, em pontos percentuais"
              table={{
                columns: ["Período", "Saldo (p.p.)", "Positivas", "Negativas"],
                rows: data.timeline.map((p) => [bucketLabelLong(p.t, bucket), p.net === null ? "—" : Math.round(p.net), p.positive, p.negative]),
              }}
            >
              <SentimentTrendChart data={data.timeline} bucket={bucket} />
            </ChartCard>
            <ChartCard
              title="Positivas × negativas"
              description="Positivas acima do eixo, negativas abaixo"
              legend={<Legend items={[{ label: "Positivas", className: "bg-sent-positive" }, { label: "Negativas", className: "bg-sent-negative" }]} />}
              table={{ columns: ["Período", "Positivas", "Negativas"], rows: data.timeline.map((p) => [bucketLabelLong(p.t, bucket), p.positive, p.negative]) }}
              delay={60}
            >
              <PositiveNegativeChart data={data.timeline} bucket={bucket} />
            </ChartCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-12">
            <ChartCard
              className="lg:col-span-5"
              title="Principais assuntos"
              description="Volume e composição de sentimento"
              legend={
                <Legend
                  items={[
                    { label: "Positivas", className: "bg-sent-positive" },
                    { label: "Neutras", className: "bg-sent-neutral" },
                    { label: "Mistas/indet.", className: "bg-sent-mixed" },
                    { label: "Negativas", className: "bg-sent-negative" },
                  ]}
                />
              }
              table={{
                columns: ["Assunto", "Total", "Positivas", "Neutras", "Negativas"],
                rows: data.topics.map((t) => [t.topic, t.count, t.positive, t.neutral, t.negative]),
              }}
            >
              <TopicBars topics={data.topics} />
            </ChartCard>
            <ChartCard
              className="lg:col-span-7"
              title="Horários de maior atividade"
              description="Menções por dia da semana e hora (horário de Brasília/Amapá)"
              table={{
                columns: ["Hora", "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
                rows: Array.from({ length: 24 }, (_, h) => [`${h}h`, ...data.heatmap.map((r) => r[h])]),
              }}
              delay={60}
            >
              <ActivityHeatmap heatmap={data.heatmap} />
            </ChartCard>
          </section>

          <section>
            <ChartCard title="Menções em destaque" description="Maior alcance e engajamento no período, ponderados pela relevância da fonte">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 [&>ul]:contents">
                <Highlights items={data.highlights} mode={mode} />
              </div>
            </ChartCard>
          </section>
        </>
      )}
    </div>
  );
}

function pct(a: number, b: number) {
  return b ? `${Math.round((a / b) * 100)}%` : "0%";
}

function NoMentions({ mode, connected, periodLabel }: { mode: "app" | "demo"; connected: number; periodLabel: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
      <CardContent className="relative flex flex-col items-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-background">
          <MessageSquareText className="size-5 text-muted-foreground" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Nenhuma menção em {periodLabel.toLowerCase()}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {connected === 0
            ? "Ainda não há fontes ativas, então nenhum dado foi coletado. O PULSO não exibe números estimados ou inventados: ative as fontes em “Fontes de monitoramento” ou registre menções manualmente."
            : "As fontes conectadas não encontraram menções neste período. Tente um período maior ou revise os termos de monitoramento."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {mode === "app" && (
            <>
              <Button asChild>
                <Link href="/painel/fontes">Configurar fontes</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/painel/mencoes">Registrar menção manualmente</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/demo">
                  Ver como fica com dados <ArrowRight />
                </Link>
              </Button>
            </>
          )}
        </div>

      </CardContent>
    </Card>
  );
}

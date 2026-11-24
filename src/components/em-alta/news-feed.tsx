"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { NewsItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const thresholds = [
  { label: "Todas", min: 0 },
  { label: "≥ 70", min: 70 },
  { label: "≥ 85", min: 85 },
];

function scoreTone(score: number) {
  if (score >= 85) return { label: "Hook forte", badge: "default" as const, bar: "bg-primary" };
  if (score >= 60) return { label: "Bom potencial", badge: "accent" as const, bar: "bg-chart-2" };
  return { label: "Fraco", badge: "secondary" as const, bar: "bg-muted-foreground/50" };
}

export function NewsFeed({ items, sources }: { items: NewsItem[]; sources: readonly string[] }) {
  const [source, setSource] = useState("todas");
  const [min, setMin] = useState(0);
  const [sort, setSort] = useState<"score" | "recentes">("score");

  const list = useMemo(
    () =>
      items
        .filter((n) => (source === "todas" || n.source === source) && n.hookScore >= min)
        .sort((a, b) => (sort === "score" ? b.hookScore - a.hookScore : b.publishedAt.localeCompare(a.publishedAt))),
    [items, source, min, sort]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {thresholds.map((t) => (
            <Button key={t.min} size="sm" variant={min === t.min ? "secondary" : "ghost"} onClick={() => setMin(t.min)}>
              {t.label}
            </Button>
          ))}
        </div>
        <span className="bg-border mx-1 hidden h-5 w-px sm:block" />
        <div className="flex gap-1">
          <Button size="sm" variant={sort === "score" ? "secondary" : "ghost"} onClick={() => setSort("score")}>Maior potencial</Button>
          <Button size="sm" variant={sort === "recentes" ? "secondary" : "ghost"} onClick={() => setSort("recentes")}>Mais recentes</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["todas", ...sources].map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              source === s ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma notícia com esse filtro.</p>}
        {list.map((n) => {
          const tone = scoreTone(n.hookScore);
          return (
            <Card key={n.id} className="gap-3 py-4">
              <CardContent className="flex flex-col gap-4 md:flex-row">
                <div className="flex w-full shrink-0 flex-row items-center gap-3 md:w-28 md:flex-col md:items-start">
                  <span className="text-3xl font-semibold tabular-nums">{n.hookScore}</span>
                  <div className="flex-1 space-y-1 md:w-full">
                    <Progress value={n.hookScore} indicatorClassName={tone.bar} className="h-1.5" />
                    <Badge variant={tone.badge} className="text-[10px]">{tone.label}</Badge>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-muted-foreground text-xs">
                    {n.source} · {new Date(n.publishedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Belem" })}
                  </p>
                  <p className="font-medium leading-snug">{n.title}</p>
                  <p className="text-muted-foreground text-sm">{n.summary}</p>
                  <div className="bg-accent/40 rounded-md border-l-2 border-l-primary px-3 py-2 text-sm">
                    <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">Hook sugerido · </span>
                    {n.suggestedHook}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap gap-1">
                      {n.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" asChild>
                        <a href={n.url} target="_blank" rel="noreferrer"><ExternalLink /> Fonte</a>
                      </Button>
                      <Button size="sm" variant="outline"><Wand2 /> Mandar pro /script</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

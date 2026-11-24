"use client";

import { useState } from "react";
import { CalendarClock, Loader2, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { platformLabels } from "@/lib/data/scheduler";
import type { Platform, PostStatus, ScheduledPost } from "@/lib/types";
import { cn } from "@/lib/utils";

const allPlatforms = Object.keys(platformLabels) as Platform[];

const statusVariant: Record<PostStatus, "default" | "secondary" | "success" | "destructive"> = {
  agendado: "default",
  rascunho: "secondary",
  publicado: "success",
  falhou: "destructive",
};

export function Scheduler({ initialPosts }: { initialPosts: ScheduledPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [caption, setCaption] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram", "tiktok", "youtube"]);
  const [when, setWhen] = useState("2026-11-28T12:00");
  const [loading, setLoading] = useState(false);

  const toggle = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, platforms }),
      });
      const data = await res.json();
      if (res.ok) setCaption(data.caption);
    } finally {
      setLoading(false);
    }
  }

  function schedule() {
    setPosts((cur) => [
      {
        id: crypto.randomUUID(),
        title: title || idea.slice(0, 60) || "Sem título",
        caption,
        platforms,
        scheduledFor: `${when}:00-03:00`,
        status: "agendado",
      },
      ...cur,
    ]);
    setTitle("");
    setIdea("");
    setCaption("");
  }

  const canSchedule = platforms.length > 0 && caption.trim() && when;
  const sorted = [...posts].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Novo post</CardTitle>
          <CardDescription>Escreva a ideia, gere a legenda e publique em todas as redes de uma vez.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">Título interno</label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: IA que faz santinho — parte 3" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="idea">Ideia / roteiro</label>
            <Textarea id="idea" rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Cole o roteiro ou descreva o vídeo…" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="caption">Legenda</label>
              <Button size="sm" variant="outline" onClick={generate} disabled={!idea.trim() || loading}>
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Gerar legenda
              </Button>
            </div>
            <Textarea id="caption" rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="A legenda gerada aparece aqui e pode ser editada." />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Plataformas</p>
            <div className="flex flex-wrap gap-2">
              {allPlatforms.map((p) => (
                <label
                  key={p}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                    platforms.includes(p) ? "border-primary/60 bg-primary/10" : "text-muted-foreground"
                  )}
                >
                  <Checkbox checked={platforms.includes(p)} onCheckedChange={() => toggle(p)} />
                  {platformLabels[p]}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium" htmlFor="when">Data e hora</label>
              <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <Button size="lg" onClick={schedule} disabled={!canSchedule}>
              <Send /> Agendar em {platforms.length} {platforms.length === 1 ? "rede" : "redes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="text-primary size-4" /> Fila</CardTitle>
          <CardDescription>{posts.filter((p) => p.status === "agendado").length} posts agendados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((p) => (
            <div key={p.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{p.title}</p>
                <Badge variant={statusVariant[p.status]} className="capitalize">{p.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {new Date(p.scheduledFor).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Belem" })}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.platforms.map((pl) => (
                  <Badge key={pl} variant="outline" className="text-[10px]">{platformLabels[pl]}</Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

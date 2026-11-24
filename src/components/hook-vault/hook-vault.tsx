"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TemplateText } from "./template-text";
import type { Hook, HookCategory } from "@/lib/types";
import { cn, formatCompact } from "@/lib/utils";

const categories: (HookCategory | "todos")[] = ["todos", "curiosidade", "contraste", "autoridade", "lista", "polêmica", "história"];

type Sort = "recentes" | "views" | "usados";

export function HookVault({ hooks }: { hooks: Hook[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("todos");
  const [sort, setSort] = useState<Sort>("recentes");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hooks
      .filter((h) => category === "todos" || h.category === category)
      .filter((h) => !q || [h.transcript, h.template, h.sourceHandle].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) =>
        sort === "views" ? b.views - a.views : sort === "usados" ? b.timesUsed - a.timesUsed : b.savedAt.localeCompare(a.savedAt)
      );
  }, [hooks, query, category, sort]);

  async function copy(h: Hook) {
    try {
      await navigator.clipboard.writeText(h.template);
    } catch {
      /* clipboard pode estar bloqueado; o feedback visual ainda ajuda */
    }
    setCopied(h.id);
    setTimeout(() => setCopied((c) => (c === h.id ? null : c)), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por texto, template ou @criador…" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["recentes", "views", "usados"] as Sort[]).map((s) => (
            <Button key={s} size="sm" variant={sort === s ? "secondary" : "ghost"} onClick={() => setSort(s)} className="capitalize">
              {s === "usados" ? "mais usados" : s}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
              category === c ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-muted-foreground text-xs">{filtered.length} hooks</p>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((h) => (
          <Card key={h.id} className="gap-4">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="accent" className="capitalize">{h.category}</Badge>
                <span className="text-muted-foreground text-xs">{h.sourceHandle}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatCompact(h.views)} views</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">Template</p>
                <p className="text-base leading-relaxed"><TemplateText template={h.template} /></p>
              </div>
              <div className="border-l-2 pl-3">
                <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">Transcrição original</p>
                <p className="text-muted-foreground text-sm italic">“{h.transcript}”</p>
              </div>
            </CardContent>
            <CardFooter className="mt-auto justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                Usado {h.timesUsed}× · salvo {new Date(h.savedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" asChild>
                  <a href={h.sourceUrl} target="_blank" rel="noreferrer" aria-label="Abrir original"><ExternalLink /></a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => copy(h)}>
                  {copied === h.id ? <Check className="text-success" /> : <Copy />}
                  {copied === h.id ? "Copiado" : "Copiar template"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

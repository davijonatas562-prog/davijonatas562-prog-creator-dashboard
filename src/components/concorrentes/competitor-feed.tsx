"use client";

import { useMemo, useState } from "react";
import { BookmarkPlus, Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CompetitorReel } from "@/lib/types";
import { cn, formatCompact } from "@/lib/utils";

export function CompetitorFeed({ reels, creators }: { reels: CompetitorReel[]; creators: string[] }) {
  const [handle, setHandle] = useState<string>("todos");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const list = useMemo(
    () => reels.filter((r) => handle === "todos" || r.handle === handle).sort((a, b) => b.multiplier - a.multiplier),
    [reels, handle]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {["todos", ...creators].map((c) => (
          <button
            key={c}
            onClick={() => setHandle(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              handle === c ? "border-primary bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((r, i) => (
          <Card key={r.id} className="py-4">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="text-muted-foreground w-6 text-sm font-semibold tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.hook}</p>
                <p className="text-muted-foreground text-xs">
                  {r.handle} · {new Date(`${r.postedAt}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} ·{" "}
                  {formatCompact(r.likes)} likes · {formatCompact(r.comments)} comentários
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCompact(r.views)}</p>
                  <p className="text-muted-foreground text-[11px]">views</p>
                </div>
                <Badge variant={r.multiplier >= 5 ? "default" : "accent"} className="tabular-nums">
                  {r.multiplier.toFixed(1).replace(".", ",")}×
                </Badge>
                <Button size="sm" variant="ghost" asChild>
                  <a href={r.url} target="_blank" rel="noreferrer" aria-label="Abrir reel"><ExternalLink /></a>
                </Button>
                <Button
                  size="sm"
                  variant={saved.has(r.id) ? "secondary" : "outline"}
                  onClick={() => setSaved((s) => new Set(s).add(r.id))}
                  disabled={saved.has(r.id)}
                >
                  {saved.has(r.id) ? <Check /> : <BookmarkPlus />}
                  {saved.has(r.id) ? "No Vault" : "Vault"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

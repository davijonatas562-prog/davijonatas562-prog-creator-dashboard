import type { Metadata } from "next";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompetitorFeed } from "@/components/concorrentes/competitor-feed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { competitorReels, lastScrapeAt, nextScrapeAt, trackedCreators } from "@/lib/data/competitors";
import { getNavItem } from "@/lib/nav";

const item = getNavItem("/concorrentes");
export const metadata: Metadata = { title: item.title };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Belem" });

export default function ConcorrentesPage() {
  return (
    <>
      <PageHeader
        item={item}
        actions={
          <>
            <Badge variant="outline">{trackedCreators.length} criadores</Badge>
            <Button variant="outline"><RefreshCw /> Raspar agora</Button>
          </>
        }
      />
      <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span>Última raspagem: <span className="text-foreground">{fmt(lastScrapeAt)}</span></span>
        <span>Próxima: <span className="text-foreground">{fmt(nextScrapeAt)}</span></span>
        <span>Ordenado por performance vs. mediana do criador</span>
      </div>
      <CompetitorFeed reels={competitorReels} creators={trackedCreators} />
    </>
  );
}

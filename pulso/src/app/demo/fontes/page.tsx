import { SourcesBoard, type SourceRow, type SyncRunRow } from "@/components/sources/sources-board";
import { SOURCES } from "@/lib/connectors/catalog";
import { UNAVAILABLE_REASON } from "@/lib/connectors/registry";
import { DEMO_PROFILES, demoSourceStatuses, generateDemoMentions } from "@/lib/demo/data";

export const metadata = { title: "Fontes · Demonstração" };

const DEMO_FEEDS: Partial<Record<string, string[]>> = {
  news_sites: ["https://portalauroranoticias.exemplo/feed/", "https://radiocomunitaria.exemplo/rss"],
  blogs: ["https://blogcidadeviva.exemplo/feed"],
};

export default function DemoSourcesPage() {
  const now = new Date();
  const statuses = demoSourceStatuses(now, generateDemoMentions(now));
  const rows: SourceRow[] = SOURCES.map((s) => {
    const st = statuses.find((x) => x.sourceId === s.id)!;
    const unavailable = UNAVAILABLE_REASON[s.id] ?? null;
    return {
      sourceId: s.id,
      status: unavailable ? "not_connected" : st.status,
      lastSyncedAt: st.lastSyncedAt,
      mentionsFound: st.mentionsFound,
      lastError: st.lastError,
      feeds: DEMO_FEEDS[s.id] ?? [],
      implemented: !unavailable,
      missingSetup: null,
      unavailableReason: unavailable,
    };
  });
  const runs: SyncRunRow[] = ["instagram", "facebook", "google_news", "news_sites", "blogs", "youtube"].map((sourceId, i) => ({
    id: i + 1,
    sourceId: sourceId as SyncRunRow["sourceId"],
    startedAt: new Date(now.getTime() - (i + 1) * 17 * 60_000).toISOString(),
    found: 40 - i * 5,
    inserted: 12 - i,
    error: sourceId === "youtube" ? "Cota diária da API do YouTube esgotada. A coleta volta automaticamente amanhã." : null,
    trigger: i % 2 ? "cron" : "manual",
  }));
  return (
    <SourcesBoard
      mode="demo"
      rows={rows}
      runs={runs}
      profiles={DEMO_PROFILES}
      metaConfigured
      metaPages={[{ pageId: "1", pageName: "Prefeito João Silva (Página fictícia)", igUserId: "2", igUsername: "prefeitojoaosilva.demo" }]}
      metaAccounts={[{ profileId: DEMO_PROFILES[0].id, pageId: "1" }]}
      canEdit
      maxSources={11}
    />
  );
}

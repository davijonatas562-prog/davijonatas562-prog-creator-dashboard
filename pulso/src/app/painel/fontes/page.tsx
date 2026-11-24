import type { Metadata } from "next";
import { SourcesBoard, type MetaPageOption, type SourceRow, type SyncRunRow } from "@/components/sources/sources-board";
import { requireOrg, canEdit } from "@/lib/data/session";
import { listProfiles } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { SOURCES } from "@/lib/connectors/catalog";
import { CONNECTORS, UNAVAILABLE_REASON } from "@/lib/connectors/registry";
import { feedsFromConfig } from "@/lib/connectors/rss";
import { accountsFromConfig, isMetaConfigured } from "@/lib/connectors/meta";
import type { ConnectionStatus, SourceId } from "@/lib/types";
import { disconnectMeta, saveFeeds, saveMetaAccounts, setSourceEnabled, syncNow } from "./actions";

export const metadata: Metadata = { title: "Fontes de monitoramento" };
export const maxDuration = 60;

type Conn = { source_id: SourceId; status: ConnectionStatus; last_synced_at: string | null; mentions_found: number; last_error: string | null; config: Record<string, unknown> };
type Run = { id: number; source_id: SourceId; started_at: string; found: number; inserted: number; error: string | null; trigger: "manual" | "cron" };

export default async function SourcesPage() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const [{ data: conns }, { data: runs }, { data: plan }, profiles] = await Promise.all([
    supabase.from("social_connections").select("source_id, status, last_synced_at, mentions_found, last_error, config").eq("organization_id", ctx.org.id),
    supabase.from("sync_runs").select("id, source_id, started_at, found, inserted, error, trigger").eq("organization_id", ctx.org.id).order("started_at", { ascending: false }).limit(15),
    supabase.from("plans").select("max_sources").eq("id", ctx.org.planId).maybeSingle(),
    listProfiles(ctx.org.id),
  ]);
  const byId = new Map(((conns ?? []) as Conn[]).map((c) => [c.source_id, c]));
  const rows: SourceRow[] = SOURCES.map((s) => {
    const c = byId.get(s.id);
    const connector = CONNECTORS[s.id];
    return {
      sourceId: s.id,
      status: c?.status ?? "not_connected",
      lastSyncedAt: c?.last_synced_at ?? null,
      mentionsFound: c?.mentions_found ?? 0,
      lastError: c?.last_error ?? null,
      feeds: feedsFromConfig(c?.config ?? {}),
      implemented: !!connector,
      missingSetup: connector?.missingSetup() ?? null,
      unavailableReason: UNAVAILABLE_REASON[s.id] ?? null,
    };
  });
  const fbConfig = byId.get("facebook")?.config ?? {};
  const metaPages = (Array.isArray(fbConfig.available) ? fbConfig.available : []) as MetaPageOption[];
  const metaAccounts = accountsFromConfig(fbConfig).map((a) => ({ profileId: a.profileId, pageId: a.pageId }));
  return (
    <SourcesBoard
      mode="app"
      rows={rows}
      runs={((runs ?? []) as Run[]).map((r) => ({ id: r.id, sourceId: r.source_id, startedAt: r.started_at, found: r.found, inserted: r.inserted, error: r.error, trigger: r.trigger })) as SyncRunRow[]}
      profiles={profiles}
      metaConfigured={isMetaConfigured()}
      metaPages={metaPages}
      metaAccounts={metaAccounts}
      canEdit={canEdit(ctx.org.role)}
      maxSources={(plan?.max_sources as number | null) ?? null}
      actions={{ setEnabled: setSourceEnabled, saveFeeds, saveMetaAccounts, disconnectMeta, syncNow }}
    />
  );
}

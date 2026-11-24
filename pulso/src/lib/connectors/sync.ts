import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SearchTermKind, SourceId } from "@/lib/types";
import { CONNECTORS } from "./registry";
import { ConnectorError, type ProfileQuery } from "./types";
import { classifyPendingMentions } from "@/lib/sentiment/run";
import { isSentimentConfigured } from "@/lib/sentiment/classify";

const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_LOOKBACK_DAYS = 30;

export interface SourceResult {
  sourceId: SourceId;
  found: number;
  inserted: number;
  error: string | null;
  skipped?: string;
}

export interface SyncSummary {
  results: SourceResult[];
  inserted: number;
  classified: number;
  classifyError: string | null;
}

export class SyncSetupError extends Error {}

type ConnRow = { id: string; source_id: SourceId; status: string; config: Record<string, unknown>; last_synced_at: string | null; mentions_found: number };
type ProfileRow = { id: string; public_name: string; nicknames: string[]; status: string; search_terms: { term: string; kind: SearchTermKind }[] };

/**
 * Sincroniza as fontes conectadas de uma organização.
 * A permissão de quem disparou deve ser verificada antes (usa a service role para gravar).
 */
export async function syncOrganization(orgId: string, trigger: "manual" | "cron", onlySource?: SourceId): Promise<SyncSummary> {
  const admin = createAdminClient();
  if (!admin) throw new SyncSetupError("A coleta exige a chave SUPABASE_SERVICE_ROLE_KEY configurada no servidor.");

  const [{ data: conns }, { data: profiles }, { data: secretRows }] = await Promise.all([
    admin.from("social_connections").select("id, source_id, status, config, last_synced_at, mentions_found").eq("organization_id", orgId),
    admin
      .from("monitored_profiles")
      .select("id, public_name, nicknames, status, search_terms!search_terms_profile_id_fkey(term, kind)")
      .eq("organization_id", orgId)
      .eq("status", "active"),
    admin.from("connection_secrets").select("connection_id, secrets").eq("organization_id", orgId),
  ]);
  const secretsByConn = new Map((secretRows ?? []).map((s) => [s.connection_id as string, s.secrets as Record<string, unknown>]));
  const queries: ProfileQuery[] = ((profiles ?? []) as unknown as ProfileRow[]).map((p) => ({
    id: p.id,
    publicName: p.public_name,
    nicknames: p.nicknames ?? [],
    terms: p.search_terms ?? [],
  }));

  const active = ((conns ?? []) as ConnRow[]).filter((c) => c.status === "connected" && (!onlySource || c.source_id === onlySource));
  const results: SourceResult[] = [];
  let totalInserted = 0;

  await Promise.all(
    active.map(async (conn) => {
      const connector = CONNECTORS[conn.source_id];
      if (!connector) return;
      const secrets = secretsByConn.get(conn.id) ?? null;
      const setup = connector.missingSetup() ?? connector.missingConfig(conn.config ?? {}, !!secrets);
      if (setup) {
        results.push({ sourceId: conn.source_id, found: 0, inserted: 0, error: null, skipped: setup });
        await admin.from("social_connections").update({ last_error: setup }).eq("id", conn.id);
        return;
      }
      const run = await admin
        .from("sync_runs")
        .insert({ organization_id: orgId, source_id: conn.source_id, trigger })
        .select("id")
        .single();

      const since = new Date(
        Math.max(
          Date.now() - MAX_LOOKBACK_DAYS * 864e5,
          conn.last_synced_at ? new Date(conn.last_synced_at).getTime() - 6 * 3600e3 : Date.now() - DEFAULT_LOOKBACK_DAYS * 864e5,
        ),
      );

      let found = 0;
      let inserted = 0;
      let error: string | null = null;
      for (const profile of queries) {
        try {
          const items = await connector.collect({ profile, config: conn.config ?? {}, secrets, since });
          found += items.length;
          if (!items.length) continue;
          const rows = items.map((m) => ({
            organization_id: orgId,
            profile_id: profile.id,
            source_id: conn.source_id,
            external_id: m.externalId.slice(0, 200),
            url: m.url,
            author_name: m.authorName,
            content: m.content.slice(0, 5000),
            content_type: m.contentType,
            published_at: (Number.isNaN(m.publishedAt.getTime()) ? new Date() : m.publishedAt).toISOString(),
            reach: m.reach !== null && Number.isFinite(m.reach) ? Math.round(m.reach) : null,
            engagement: m.engagement !== null && Number.isFinite(m.engagement) ? Math.round(m.engagement) : null,
            relevance: Math.round(Math.min(1, Math.max(0, m.relevance)) * 100) / 100,
          }));
          const { data: ins, error: insErr } = await admin
            .from("mentions")
            .upsert(rows, { onConflict: "profile_id,source_id,external_id", ignoreDuplicates: true })
            .select("id");
          if (insErr) throw new ConnectorError("Falha ao gravar as menções.");
          inserted += ins?.length ?? 0;
        } catch (e) {
          error = e instanceof ConnectorError ? e.message : "Erro inesperado no conector.";
          if (!(e instanceof ConnectorError)) console.error(`sync ${conn.source_id}`, e);
        }
      }

      totalInserted += inserted;
      results.push({ sourceId: conn.source_id, found, inserted, error });
      await Promise.all([
        admin
          .from("social_connections")
          .update({
            last_error: error,
            ...(error ? {} : { last_synced_at: new Date().toISOString() }),
            mentions_found: (conn.mentions_found ?? 0) + inserted,
          })
          .eq("id", conn.id),
        run.data
          ? admin.from("sync_runs").update({ finished_at: new Date().toISOString(), found, inserted, error }).eq("id", run.data.id)
          : Promise.resolve(),
      ]);
    }),
  );

  // Classifica o que chegou (se a IA estiver configurada)
  let classified = 0;
  let classifyError: string | null = null;
  if (totalInserted > 0 && isSentimentConfigured()) {
    for (const p of queries) {
      try {
        const r = await classifyPendingMentions({ orgId, profileId: p.id, limit: 40 });
        classified += r.classified;
      } catch (e) {
        classifyError = e instanceof Error ? e.message : "Falha na análise.";
      }
    }
  }
  return { results, inserted: totalInserted, classified, classifyError };
}

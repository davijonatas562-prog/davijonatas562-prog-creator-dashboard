import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Mention, MonitoredProfile, Sentiment, SourceId, SourceStatus, ConnectionStatus } from "@/lib/types";
import type { Period } from "@/lib/metrics/period";

const MAX_ROWS = 20_000;

type ProfileRow = {
  id: string;
  full_name: string;
  public_name: string;
  office: string | null;
  municipality: string | null;
  state: string | null;
  party: string | null;
  photo_url: string | null;
  status: "active" | "paused";
};

export async function listProfiles(orgId: string): Promise<MonitoredProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitored_profiles")
    .select("id, full_name, public_name, office, municipality, state, party, photo_url, status")
    .eq("organization_id", orgId)
    .order("public_name");
  if (error) throw new Error(`Falha ao carregar perfis: ${error.message}`);
  return ((data ?? []) as ProfileRow[]).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    publicName: p.public_name,
    office: p.office,
    municipality: p.municipality,
    state: p.state,
    party: p.party,
    photoUrl: p.photo_url,
    status: p.status,
  }));
}

type ConnRow = {
  source_id: SourceId;
  status: ConnectionStatus;
  last_synced_at: string | null;
  mentions_found: number;
  last_error: string | null;
};

export async function listSourceStatuses(orgId: string): Promise<SourceStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_connections")
    .select("source_id, status, last_synced_at, mentions_found, last_error")
    .eq("organization_id", orgId);
  if (error) throw new Error(`Falha ao carregar fontes: ${error.message}`);
  return ((data ?? []) as ConnRow[]).map((c) => ({
    sourceId: c.source_id,
    status: c.status,
    lastSyncedAt: c.last_synced_at,
    mentionsFound: c.mentions_found,
    lastError: c.last_error,
  }));
}

type MentionRow = {
  id: string;
  source_id: SourceId;
  published_at: string;
  sentiment: Sentiment | null;
  confidence: number | string | null;
  topic_name: string | null;
  reach: number | null;
  engagement: number | null;
  relevance: number | string;
  content: string | null;
  summary: string | null;
  author_name: string | null;
  url: string | null;
};

/** Menções reais do perfil no período atual + anterior (para comparação). */
export async function listMentionsForPeriod(profileId: string, period: Period): Promise<{ mentions: Mention[]; truncated: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentions_with_sentiment")
    .select("id, source_id, published_at, sentiment, confidence, topic_name, reach, engagement, relevance, content, summary, author_name, url")
    .eq("profile_id", profileId)
    .gte("published_at", period.prevStart.toISOString())
    .lt("published_at", period.end.toISOString())
    .order("published_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw new Error(`Falha ao carregar menções: ${error.message}`);
  const rows = (data ?? []) as MentionRow[];
  return {
    truncated: rows.length >= MAX_ROWS,
    mentions: rows.map((r) => ({
      id: r.id,
      sourceId: r.source_id,
      publishedAt: r.published_at,
      sentiment: r.sentiment,
      confidence: r.confidence === null ? 0 : Number(r.confidence),
      topic: r.topic_name,
      reach: r.reach,
      engagement: r.engagement,
      relevance: Number(r.relevance),
      content: r.summary ?? r.content,
      authorName: r.author_name,
      url: r.url,
    })),
  };
}

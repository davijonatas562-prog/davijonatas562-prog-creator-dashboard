import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ContentType, MentionItem, MentionStatus, Sentiment, SourceId, Stance } from "@/lib/types";
import { PAGE_SIZE, type MentionFilters } from "@/lib/mentions/filters";

type Row = {
  id: string;
  source_id: SourceId;
  published_at: string;
  content: string | null;
  summary: string | null;
  author_name: string | null;
  url: string | null;
  content_type: ContentType;
  reach: number | null;
  engagement: number | null;
  relevance: number | string;
  status: MentionStatus;
  topic_name: string | null;
  sentiment: Sentiment | null;
  confidence: number | string | null;
  emotion: string | null;
  stance: Stance | null;
  irony: boolean | null;
  sarcasm: boolean | null;
  analysis_context: string | null;
  sentiment_is_manual: boolean | null;
  analysis_model: string | null;
};

const COLUMNS =
  "id, source_id, published_at, content, summary, author_name, url, content_type, reach, engagement, relevance, status, topic_name, sentiment, confidence, emotion, stance, irony, sarcasm, analysis_context, sentiment_is_manual, analysis_model";

/** Escapa curingas e separadores do filtro `or` do PostgREST. */
function likeTerm(q: string) {
  return q.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[,()]/g, " ");
}

export async function listMentions(profileId: string, userId: string, f: MentionFilters) {
  const supabase = await createClient();

  const { data: savedRows } = await supabase.from("saved_mentions").select("mention_id").eq("user_id", userId);
  const savedIds = new Set((savedRows ?? []).map((r) => r.mention_id as string));

  let query = supabase
    .from("mentions_with_sentiment")
    .select(COLUMNS, { count: "exact" })
    .eq("profile_id", profileId)
    .gte("published_at", f.period.start.toISOString())
    .lt("published_at", f.period.end.toISOString());

  if (f.sources.length) query = query.in("source_id", f.sources);
  // grupos "ou" (sentimento, busca) combinados com "e" numa única expressão do PostgREST
  const orGroups: string[] = [];
  if (f.sentiments.length) {
    const labels = f.sentiments.filter((s) => s !== "unclassified");
    const parts = [];
    if (labels.length) parts.push(`sentiment.in.(${labels.join(",")})`);
    if (f.sentiments.includes("unclassified")) parts.push("sentiment.is.null");
    orGroups.push(parts.join(","));
  }
  if (f.topic) query = query.eq("topic_name", f.topic);
  if (f.minRelevance !== null) query = query.gte("relevance", f.minRelevance);
  if (f.contentType) query = query.eq("content_type", f.contentType);
  if (f.status) query = query.eq("status", f.status);
  if (f.savedOnly) query = query.in("id", savedIds.size ? [...savedIds] : ["00000000-0000-0000-0000-000000000000"]);
  if (f.q) {
    const t = likeTerm(f.q);
    orGroups.push(`content.ilike.%${t}%,author_name.ilike.%${t}%,summary.ilike.%${t}%`);
  }
  if (orGroups.length === 1) query = query.or(orGroups[0]);
  else if (orGroups.length > 1) query = query.or(`and(${orGroups.map((g) => `or(${g})`).join(",")})`);
  query =
    f.sort === "relevance"
      ? query.order("relevance", { ascending: false }).order("published_at", { ascending: false })
      : f.sort === "reach"
        ? query.order("reach", { ascending: false, nullsFirst: false })
        : query.order("published_at", { ascending: false });

  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(`Falha ao carregar menções: ${error.message}`);

  const items: MentionItem[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    sourceId: r.source_id,
    publishedAt: r.published_at,
    content: r.content ?? r.summary,
    authorName: r.author_name,
    url: r.url,
    contentType: r.content_type,
    reach: r.reach,
    engagement: r.engagement,
    relevance: Number(r.relevance),
    status: r.status,
    topic: r.topic_name,
    saved: savedIds.has(r.id),
    analysis: r.sentiment
      ? {
          sentiment: r.sentiment,
          confidence: Number(r.confidence ?? 0),
          emotion: r.emotion,
          stance: r.stance ?? "unknown",
          irony: !!r.irony,
          sarcasm: !!r.sarcasm,
          context: r.analysis_context,
          isManual: !!r.sentiment_is_manual,
          model: r.analysis_model,
        }
      : null,
  }));
  return { items, total: count ?? 0 };
}

/** Assuntos usados pela organização (para o filtro e para orientar a IA). */
export async function listTopics(orgId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("name").eq("organization_id", orgId).order("name");
  return (data ?? []).map((t) => t.name as string);
}

export async function countUnclassified(profileId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("mentions_with_sentiment")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .is("sentiment", null);
  return count ?? 0;
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { classifyBatch, BATCH_SIZE, SENTIMENT_MODEL, SentimentError, isSentimentConfigured } from "./classify";

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "outros";
}

/**
 * Classifica menções ainda sem análise de um perfil e grava os resultados.
 * A permissão do usuário deve ser verificada ANTES de chamar (usa service role para gravar).
 */
export async function classifyPendingMentions(opts: { orgId: string; profileId: string; mentionIds?: string[]; limit?: number }) {
  if (!isSentimentConfigured()) throw new SentimentError("A análise por IA não está configurada (ANTHROPIC_API_KEY).");
  const admin = createAdminClient();
  if (!admin) throw new SentimentError("Gravar análises exige SUPABASE_SERVICE_ROLE_KEY no servidor.");

  const { data: profile } = await admin
    .from("monitored_profiles")
    .select("public_name, office, municipality, state, organization_id")
    .eq("id", opts.profileId)
    .single();
  if (!profile || profile.organization_id !== opts.orgId) throw new SentimentError("Perfil não encontrado.");

  let q = admin
    .from("mentions_with_sentiment")
    .select("id, source_id, author_name, content, summary")
    .eq("profile_id", opts.profileId)
    .is("sentiment", null)
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 60);
  if (opts.mentionIds?.length) q = q.in("id", opts.mentionIds);
  const { data: pending, error } = await q;
  if (error) throw new SentimentError("Falha ao ler menções pendentes.");
  if (!pending?.length) return { classified: 0, remaining: 0 };

  const [{ data: topicRows }, { data: corrections }] = await Promise.all([
    admin.from("topics").select("id, name, slug").eq("organization_id", opts.orgId),
    admin
      .from("sentiment_analysis")
      .select("sentiment, mentions!sentiment_analysis_mention_id_fkey(content)")
      .eq("organization_id", opts.orgId)
      .eq("is_manual", true)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const topicBySlug = new Map((topicRows ?? []).map((t) => [t.slug as string, t.id as string]));
  const examples = ((corrections ?? []) as unknown as { sentiment: string; mentions: { content: string | null } | null }[])
    .filter((c) => c.mentions?.content)
    .map((c) => ({ text: c.mentions!.content!, sentiment: c.sentiment }));

  let classified = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE).filter((m) => (m.content ?? m.summary)?.trim());
    const results = await classifyBatch({
      profile: { publicName: profile.public_name, office: profile.office, municipality: profile.municipality, state: profile.state },
      knownTopics: (topicRows ?? []).map((t) => t.name as string),
      corrections: examples,
      mentions: batch.map((m) => ({ id: m.id, source: m.source_id, author: m.author_name, text: (m.content ?? m.summary) as string })),
    });

    for (const r of results) {
      const slug = slugify(r.topic);
      if (!topicBySlug.has(slug)) {
        const { data: t } = await admin
          .from("topics")
          .upsert({ organization_id: opts.orgId, name: r.topic, slug }, { onConflict: "organization_id,slug" })
          .select("id")
          .single();
        if (t) topicBySlug.set(slug, t.id as string);
      }
    }
    if (!results.length) continue;
    const { error: insErr } = await admin.from("sentiment_analysis").insert(
      results.map((r) => ({
        organization_id: opts.orgId,
        mention_id: r.id,
        sentiment: r.sentiment,
        topic_id: topicBySlug.get(slugify(r.topic)) ?? null,
        emotion: r.emotion,
        stance: r.stance,
        irony: r.irony,
        sarcasm: r.sarcasm,
        context: r.context,
        confidence: Math.round(r.confidence * 100) / 100,
        model: SENTIMENT_MODEL,
      })),
    );
    if (insErr) throw new SentimentError("Falha ao gravar as análises.");
    await Promise.all(
      results.map((r) => admin.from("mentions").update({ topic_id: topicBySlug.get(slugify(r.topic)) ?? null }).eq("id", r.id)),
    );
    classified += results.length;
  }

  const { count } = await admin
    .from("mentions_with_sentiment")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", opts.profileId)
    .is("sentiment", null);
  return { classified, remaining: count ?? 0 };
}

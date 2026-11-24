"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/data/session";
import { rateLimit } from "@/lib/rate-limit";
import { classifyPendingMentions } from "@/lib/sentiment/run";
import { SentimentError, isSentimentConfigured } from "@/lib/sentiment/classify";
import { manualMentionSchema } from "@/lib/validation/profile";
import type { ActionResult } from "@/lib/action-result";
import type { MemberRole } from "@/lib/types";

const uuid = z.string().uuid();
const canWork = (r: MemberRole) => r === "owner" || r === "admin" || r === "analyst";
const DENIED: ActionResult = { ok: false, error: "Seu papel (leitor) não permite alterar menções." };

export async function setMentionStatus(id: string, status: string): Promise<ActionResult> {
  const parsed = z.object({ id: uuid, status: z.enum(["new", "in_review", "responded", "resolved", "ignored"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canWork(ctx.org.role)) return DENIED;
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentions").update({ status: parsed.data.status }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível atualizar o status." };
  revalidatePath("/painel/mencoes");
  return { ok: true, message: "Status atualizado." };
}

export async function toggleSavedMention(id: string, save: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  const supabase = await createClient();
  const { error } = save
    ? await supabase.from("saved_mentions").upsert({ organization_id: ctx.org.id, mention_id: id, user_id: ctx.user.id })
    : await supabase.from("saved_mentions").delete().eq("mention_id", id).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: "Não foi possível salvar a menção." };
  revalidatePath("/painel/mencoes");
  return { ok: true, message: save ? "Menção salva." : "Removida das salvas." };
}

export async function correctMentionSentiment(id: string, sentiment: string): Promise<ActionResult> {
  const parsed = z.object({ id: uuid, s: z.enum(["positive", "negative", "neutral", "mixed", "undetermined"]) }).safeParse({ id, s: sentiment });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canWork(ctx.org.role)) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.rpc("correct_sentiment", { p_mention: id, p_sentiment: parsed.data.s });
  if (error) return { ok: false, error: "Não foi possível corrigir o sentimento." };
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Sentimento corrigido. A correção passa a orientar as próximas análises." };
}

export async function addManualMention(input: unknown): Promise<ActionResult> {
  const parsed = manualMentionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ctx = await requireOrg();
  if (!canWork(ctx.org.role)) return DENIED;
  const d = parsed.data;
  const published = new Date(d.publishedAt);
  if (Number.isNaN(published.getTime())) return { ok: false, error: "Data inválida." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("add_manual_mention", {
    p_profile: d.profileId,
    p_source: d.sourceId,
    p_content: d.content,
    p_url: d.url || null,
    p_author: d.author || null,
    p_published_at: published.toISOString(),
    p_content_type: d.contentType,
  });
  if (error || !id) {
    const m = error?.message ?? "";
    return { ok: false, error: m.includes("futuro") ? "A data não pode estar no futuro." : m.includes("link") ? "Link inválido." : "Não foi possível registrar a menção." };
  }
  let note = " Ela aparecerá como “não classificada”.";
  if (isSentimentConfigured()) {
    try {
      await classifyPendingMentions({ orgId: ctx.org.id, profileId: d.profileId, mentionIds: [id as string] });
      note = " A IA já analisou o sentimento.";
    } catch (e) {
      note = e instanceof SentimentError ? ` A análise automática falhou: ${e.message}` : note;
    }
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: `Menção registrada.${note}` };
}

export async function classifyPending(profileId: string): Promise<ActionResult> {
  if (!uuid.safeParse(profileId).success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canWork(ctx.org.role)) return DENIED;
  const rl = rateLimit(`classify:${ctx.org.id}`, 10, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: `Limite de análises por hora atingido. Tente em ${Math.ceil(rl.retryAfterSec / 60)} min.` };
  try {
    const r = await classifyPendingMentions({ orgId: ctx.org.id, profileId });
    revalidatePath("/painel", "layout");
    if (r.classified === 0) return { ok: true, message: "Não há menções pendentes de classificação." };
    return { ok: true, message: `${r.classified} menções classificadas.${r.remaining ? ` Restam ${r.remaining}.` : ""}` };
  } catch (e) {
    if (e instanceof SentimentError) return { ok: false, error: e.message };
    console.error("classifyPending", e);
    return { ok: false, error: "Falha inesperada ao classificar." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrg, canEdit } from "@/lib/data/session";
import { CONNECTORS } from "@/lib/connectors/registry";
import { assertPublicUrl, fetchText } from "@/lib/connectors/http";
import { parseFeed } from "@/lib/connectors/rss";
import { ConnectorError } from "@/lib/connectors/types";
import { syncOrganization, SyncSetupError } from "@/lib/connectors/sync";
import { rateLimit } from "@/lib/rate-limit";
import { sourceName } from "@/lib/connectors/catalog";
import type { ActionResult } from "@/lib/action-result";
import type { SourceId } from "@/lib/types";

const DENIED: ActionResult = { ok: false, error: "Apenas proprietários e administradores configuram as fontes." };
const sourceSchema = z.enum(["instagram", "facebook", "x", "tiktok", "youtube", "threads", "google_news", "news_sites", "blogs", "reddit", "other"]);

export async function setSourceEnabled(sourceId: string, enabled: boolean): Promise<ActionResult> {
  const parsed = sourceSchema.safeParse(sourceId);
  if (!parsed.success || !CONNECTORS[parsed.data]) return { ok: false, error: "Fonte indisponível." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const supabase = await createClient();
  if (enabled) {
    const [{ data: plan }, { count }] = await Promise.all([
      supabase.from("plans").select("max_sources").eq("id", ctx.org.planId).maybeSingle(),
      supabase.from("social_connections").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("status", "connected"),
    ]);
    const max = plan?.max_sources as number | null | undefined;
    if (max != null && (count ?? 0) >= max) return { ok: false, error: `Seu plano permite ${max} fontes ativas. Desative outra fonte ou mude de plano.` };
  }
  const { data, error } = await supabase
    .from("social_connections")
    .update({ status: enabled ? "connected" : "paused" })
    .eq("organization_id", ctx.org.id)
    .eq("source_id", parsed.data)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível alterar a fonte." };
  await supabase.rpc("log_audit", { org: ctx.org.id, p_action: enabled ? "connector.enabled" : "connector.paused", p_entity: "social_connections", p_entity_id: parsed.data });
  revalidatePath("/painel", "layout");
  return { ok: true, message: `${sourceName(parsed.data)} ${enabled ? "ativada" : "pausada"}.` };
}

/** Salva os feeds RSS, validando cada um (precisa responder com RSS/Atom válido). */
export async function saveFeeds(sourceId: string, feeds: string[]): Promise<ActionResult> {
  const parsed = z.object({ s: z.enum(["news_sites", "blogs"]), f: z.array(z.string().trim().max(500)).max(30) }).safeParse({ s: sourceId, f: feeds });
  if (!parsed.success) return { ok: false, error: "No máximo 30 feeds por fonte." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const unique = [...new Set(parsed.data.f.filter(Boolean))];
  const problems: string[] = [];
  await Promise.all(
    unique.map(async (u) => {
      try {
        const items = parseFeed(await fetchText(assertPublicUrl(u).toString(), {}, 10000));
        if (!items.length) problems.push(`${u}: feed sem itens`);
      } catch (e) {
        problems.push(`${u}: ${e instanceof ConnectorError ? e.message : "erro"}`);
      }
    }),
  );
  if (problems.length) return { ok: false, error: `Corrija antes de salvar — ${problems.join(" | ")}` };
  const supabase = await createClient();
  const { data: conn } = await supabase.from("social_connections").select("config").eq("organization_id", ctx.org.id).eq("source_id", parsed.data.s).single();
  const { error } = await supabase
    .from("social_connections")
    .update({ config: { ...((conn?.config as object) ?? {}), feeds: unique } })
    .eq("organization_id", ctx.org.id)
    .eq("source_id", parsed.data.s);
  if (error) return { ok: false, error: "Não foi possível salvar os feeds." };
  revalidatePath("/painel/fontes");
  return { ok: true, message: unique.length ? `${unique.length} feed(s) verificado(s) e salvo(s).` : "Feeds removidos." };
}

/** Liga cada perfil monitorado a uma Página do Facebook (e ao Instagram dela). */
export async function saveMetaAccounts(mapping: { profileId: string; pageId: string }[]): Promise<ActionResult> {
  const parsed = z.array(z.object({ profileId: z.string().uuid(), pageId: z.string().regex(/^\d+$/) })).max(50).safeParse(mapping);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const supabase = await createClient();
  const { data: conns } = await supabase.from("social_connections").select("source_id, config").eq("organization_id", ctx.org.id).in("source_id", ["facebook", "instagram"]);
  const available = ((conns?.find((c) => c.source_id === "facebook")?.config as { available?: { pageId: string; pageName: string; igUserId: string | null; igUsername: string | null }[] })?.available) ?? [];
  const accounts = parsed.data
    .map((m) => {
      const p = available.find((a) => a.pageId === m.pageId);
      return p ? { profileId: m.profileId, ...p } : null;
    })
    .filter(Boolean);
  for (const c of conns ?? []) {
    const hasIg = accounts.some((a) => a!.igUserId);
    const status = accounts.length && (c.source_id === "facebook" || hasIg) ? "connected" : "not_connected";
    await supabase
      .from("social_connections")
      .update({ config: { ...(c.config as object), accounts }, status })
      .eq("organization_id", ctx.org.id)
      .eq("source_id", c.source_id);
  }
  await supabase.rpc("log_audit", { org: ctx.org.id, p_action: "connector.meta_accounts", p_entity: "social_connections", p_metadata: { accounts: accounts.length } });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Contas da Meta vinculadas aos perfis." };
}

export async function disconnectMeta(): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Desconectar exige SUPABASE_SERVICE_ROLE_KEY no servidor." };
  const { data: conns } = await admin.from("social_connections").select("id").eq("organization_id", ctx.org.id).in("source_id", ["facebook", "instagram"]);
  const ids = (conns ?? []).map((c) => c.id as string);
  await admin.from("connection_secrets").delete().in("connection_id", ids);
  await admin.from("social_connections").update({ config: {}, status: "not_connected", last_error: null }).in("id", ids);
  await admin.from("audit_logs").insert({ organization_id: ctx.org.id, user_id: ctx.user.id, action: "connector.meta_disconnected", entity: "social_connections" });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Instagram e Facebook desconectados. Os tokens foram apagados." };
}

export async function syncNow(sourceId?: string): Promise<ActionResult> {
  const only = sourceId ? sourceSchema.safeParse(sourceId) : null;
  if (only && !only.success) return { ok: false, error: "Fonte inválida." };
  const ctx = await requireOrg();
  if (ctx.org.role === "viewer") return { ok: false, error: "Seu papel (leitor) não permite atualizar o monitoramento." };
  const rl = rateLimit(`sync:${ctx.org.id}`, 6, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: `Limite de atualizações por hora atingido. Tente em ${Math.ceil(rl.retryAfterSec / 60)} min.` };
  try {
    const r = await syncOrganization(ctx.org.id, "manual", only?.data as SourceId | undefined);
    revalidatePath("/painel", "layout");
    if (!r.results.length) return { ok: false, error: "Nenhuma fonte ativa. Ative e configure as fontes em “Fontes de monitoramento”." };
    const errs = r.results.filter((x) => x.error || x.skipped);
    const base = `${r.inserted} nova(s) menção(ões) coletada(s)${r.classified ? `, ${r.classified} classificada(s) pela IA` : ""}.`;
    const extra = errs.length ? ` Atenção: ${errs.map((e) => `${sourceName(e.sourceId)}: ${e.error ?? e.skipped}`).join(" | ")}` : "";
    return errs.length === r.results.length ? { ok: false, error: `Nenhuma fonte pôde ser consultada. ${extra}` } : { ok: true, message: base + extra };
  } catch (e) {
    if (e instanceof SyncSetupError) return { ok: false, error: e.message };
    console.error("syncNow", e);
    return { ok: false, error: "Falha inesperada na coleta." };
  }
}

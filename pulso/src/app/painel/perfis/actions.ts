"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, canEdit } from "@/lib/data/session";
import { profileSchema } from "@/lib/validation/profile";
import type { ActionResult } from "@/lib/action-result";

const DENIED: ActionResult = { ok: false, error: "Apenas proprietários e administradores gerenciam perfis." };

export async function saveProfile(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const d = parsed.data;
  if (d.photoPath && !d.photoPath.startsWith(`${ctx.org.id}/`)) return { ok: false, error: "Foto inválida." };

  const terms = (["primary", "related", "context", "exclude"] as const).flatMap((kind) => d[kind].map((term) => ({ term, kind })));
  const data: Record<string, unknown> = {
    full_name: d.fullName,
    public_name: d.publicName,
    nicknames: d.nicknames,
    office: d.office,
    municipality: d.municipality,
    state: d.state,
    party: d.party,
  };
  if (d.photoPath !== null) data.photo_url = d.photoPath;

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("save_monitored_profile", { p_org: ctx.org.id, p_id: d.id, p_data: data, p_terms: terms });
  if (error) {
    const m = error.message;
    if (m.includes("limite do plano")) return { ok: false, error: `Seu plano permite ${m.match(/até (\d+)/)?.[1] ?? "poucos"} perfil(is) monitorado(s). Remova um perfil ou mude de plano.` };
    return { ok: false, error: "Não foi possível salvar o perfil." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: d.id ? "Perfil atualizado." : "Perfil cadastrado.", redirectTo: `/painel/perfis?salvo=${id}` };
}

export async function setProfileStatus(id: string, status: "active" | "paused"): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success || !["active", "paused"].includes(status)) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const supabase = await createClient();
  const { data, error } = await supabase.from("monitored_profiles").update({ status }).eq("id", id).eq("organization_id", ctx.org.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível alterar o status." };
  await supabase.rpc("log_audit", { org: ctx.org.id, p_action: `profile.${status}`, p_entity: "monitored_profiles", p_entity_id: id });
  revalidatePath("/painel", "layout");
  return { ok: true, message: status === "paused" ? "Monitoramento pausado." : "Monitoramento retomado." };
}

export async function deleteProfile(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const supabase = await createClient();
  const { data, error } = await supabase.from("monitored_profiles").delete().eq("id", id).eq("organization_id", ctx.org.id).select("id, photo_url");
  if (error || !data?.length) return { ok: false, error: "Não foi possível excluir o perfil." };
  const photo = data[0].photo_url as string | null;
  if (photo && !photo.startsWith("http")) await supabase.storage.from("profile-photos").remove([photo]);
  await supabase.rpc("log_audit", { org: ctx.org.id, p_action: "profile.deleted", p_entity: "monitored_profiles", p_entity_id: id });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Perfil e menções associadas excluídos." };
}

const MAX_PHOTO = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Envia a foto para o bucket privado e devolve o caminho; o perfil guarda o caminho no save. */
export async function uploadProfilePhoto(form: FormData): Promise<ActionResult & { path?: string }> {
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return DENIED;
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Arquivo não recebido." };
  const ext = TYPES[file.type];
  if (!ext) return { ok: false, error: "Use uma imagem JPG, PNG ou WEBP." };
  if (file.size > MAX_PHOTO) return { ok: false, error: "A foto pode ter no máximo 2 MB." };
  const path = `${ctx.org.id}/${crypto.randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("profile-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "Falha ao enviar a foto. Verifique se o bucket profile-photos existe (migration da Fase 2)." };
  return { ok: true, path, message: "Foto enviada." };
}

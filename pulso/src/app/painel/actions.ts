"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_COOKIE, getSessionContext, requireOrg, canEdit } from "@/lib/data/session";
import { listSourceStatuses } from "@/lib/data/dashboard";
import { SOURCE_BY_ID } from "@/lib/connectors/catalog";
import { profileNameSchema, resetSchema } from "@/lib/validation/auth";
import type { ActionResult } from "@/lib/action-result";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" };

export async function switchOrganization(orgId: string): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx.memberships.some((m) => m.id === orgId)) return { ok: false, error: "Você não faz parte desta organização." };
  (await cookies()).set(ORG_COOKIE, orgId, COOKIE_OPTS);
  revalidatePath("/painel", "layout");
  return { ok: true };
}

/**
 * Atualizar monitoramento: dispara a sincronização das fontes conectadas.
 * Enquanto nenhum conector estiver implementado (Fase 3), informa isso com clareza
 * e apenas recarrega os dados já armazenados — nunca simula uma coleta.
 */
export async function refreshMonitoring(): Promise<ActionResult> {
  const ctx = await requireOrg();
  const statuses = await listSourceStatuses(ctx.org.id);
  const runnable = statuses.filter((s) => s.status === "connected" && SOURCE_BY_ID[s.sourceId]?.implemented);
  revalidatePath("/painel");
  if (runnable.length === 0) {
    return {
      ok: false,
      error: "Nenhuma fonte conectada para sincronizar. Os dados exibidos foram recarregados do banco; os conectores chegam na Fase 3.",
    };
  }
  return { ok: true, message: `Sincronização solicitada para ${runnable.length} fonte(s).` };
}

export async function updateMyName(input: unknown): Promise<ActionResult> {
  const parsed = profileNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ctx = await getSessionContext();
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ full_name: parsed.data.fullName }).eq("id", ctx.user.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  await supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Nome atualizado." };
}

export async function changeMyPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "Não foi possível alterar a senha. Use uma senha diferente da atual." };
  await supabase.rpc("log_audit", { org: null, p_action: "user.password_changed", p_entity: "users" });
  return { ok: true, message: "Senha alterada." };
}

const orgUpdateSchema = z.object({
  name: z.string().trim().min(2, "Use pelo menos 2 caracteres.").max(120),
  dataRetentionDays: z.coerce.number().int().refine((v) => [30, 90, 180, 365, 730].includes(v), "Período de retenção inválido."),
});

export async function updateOrganization(input: unknown): Promise<ActionResult> {
  const parsed = orgUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return { ok: false, error: "Apenas proprietários e administradores podem editar a organização." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, data_retention_days: parsed.data.dataRetentionDays })
    .eq("id", ctx.org.id);
  if (error) return { ok: false, error: "Não foi possível salvar as alterações." };
  await supabase.rpc("log_audit", {
    org: ctx.org.id,
    p_action: "organization.updated",
    p_entity: "organizations",
    p_entity_id: ctx.org.id,
    p_metadata: parsed.data,
  });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Organização atualizada." };
}

const roleSchema = z.object({ userId: z.string().uuid(), role: z.enum(["admin", "analyst", "viewer"]) });

export async function changeMemberRole(input: unknown): Promise<ActionResult> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return { ok: false, error: "Sem permissão para alterar papéis." };
  if (parsed.data.userId === ctx.user.id) return { ok: false, error: "Você não pode alterar o próprio papel." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("organization_id", ctx.org.id)
    .eq("user_id", parsed.data.userId)
    .select("user_id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível alterar o papel deste membro." };
  await supabase.rpc("log_audit", {
    org: ctx.org.id,
    p_action: "member.role_changed",
    p_entity: "organization_members",
    p_entity_id: parsed.data.userId,
    p_metadata: { role: parsed.data.role },
  });
  revalidatePath("/painel/organizacao");
  return { ok: true, message: "Papel atualizado." };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(userId).success) return { ok: false, error: "Dados inválidos." };
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) return { ok: false, error: "Sem permissão para remover membros." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", ctx.org.id)
    .eq("user_id", userId)
    .select("user_id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível remover este membro." };
  await supabase.rpc("log_audit", { org: ctx.org.id, p_action: "member.removed", p_entity: "organization_members", p_entity_id: userId });
  revalidatePath("/painel/organizacao");
  return { ok: true, message: "Membro removido." };
}

/** LGPD: o proprietário exclui a organização e TODOS os dados dela (cascata). */
export async function deleteOrganization(confirmName: string): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (ctx.org.role !== "owner") return { ok: false, error: "Apenas o proprietário pode excluir a organização." };
  if (confirmName.trim() !== ctx.org.name) return { ok: false, error: "Digite o nome exato da organização para confirmar." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").delete().eq("id", ctx.org.id).select("id");
  if (error || !data?.length) return { ok: false, error: "Não foi possível excluir a organização." };
  (await cookies()).delete(ORG_COOKIE);
  redirect("/onboarding");
}

/** LGPD: exclusão da própria conta. Exige que a pessoa não seja proprietária de nenhuma organização. */
export async function deleteMyAccount(confirm: string): Promise<ActionResult> {
  if (confirm.trim().toUpperCase() !== "EXCLUIR") return { ok: false, error: "Digite EXCLUIR para confirmar." };
  const ctx = await getSessionContext();
  const owned = ctx.memberships.filter((m) => m.role === "owner");
  if (owned.length) {
    return { ok: false, error: `Você é proprietário de: ${owned.map((o) => o.name).join(", ")}. Exclua essas organizações antes de excluir a conta.` };
  }
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "A exclusão de conta exige a SUPABASE_SERVICE_ROLE_KEY configurada no servidor." };
  const { error } = await admin.auth.admin.deleteUser(ctx.user.id);
  if (error) return { ok: false, error: "Não foi possível excluir a conta." };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

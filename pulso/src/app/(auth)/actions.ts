"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { forgotSchema, resetSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";

const NOT_CONFIGURED: ActionResult = {
  ok: false,
  error: "A autenticação ainda não está configurada neste ambiente. Defina as variáveis do Supabase (veja o README).",
};

async function clientKey(scope: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return siteUrl(host ? `${proto}://${host}` : undefined);
}

/** Só aceita caminhos internos para evitar open redirect. */
function safeNext(next: unknown, fallback: string) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Já existe uma conta com este e-mail.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("password")) return "A senha não atende aos requisitos de segurança.";
  if (m.includes("same password") || m.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  return "Não foi possível concluir a operação. Tente novamente em instantes.";
}

export async function signIn(input: unknown, next?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const rl = rateLimit(await clientKey("signin"), 8, 10 * 60_000);
  if (!rl.ok) return { ok: false, error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.retryAfterSec / 60)} min.` };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: translateAuthError(error.message) };
  redirect(safeNext(next, "/painel"));
}

export async function signUp(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const rl = rateLimit(await clientKey("signup"), 5, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Muitos cadastros a partir desta rede. Tente mais tarde." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, consent_at: new Date().toISOString(), consent_version: "2026-11" },
      emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  if (data.session) redirect("/onboarding");
  return { ok: true, message: "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta." };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const rl = rateLimit(await clientKey("reset"), 4, 30 * 60_000);
  if (!rl.ok) return { ok: false, error: "Muitas solicitações. Aguarde alguns minutos." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/redefinir-senha`,
  });
  // Resposta sempre igual: não revela se o e-mail existe
  return { ok: true, message: "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha." };
}

export async function updatePassword(input: unknown): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "O link expirou. Solicite uma nova redefinição de senha." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  await supabase.rpc("log_audit", { org: null, p_action: "user.password_changed", p_entity: "users", p_entity_id: user.id });
  return { ok: true, message: "Senha atualizada com sucesso.", redirectTo: "/painel" };
}

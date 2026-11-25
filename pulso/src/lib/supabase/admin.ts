import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

function serviceKey() {
  const raw = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  return raw.includes("=") ? (raw.split("=").pop() ?? "") : raw;
}

/** Explica o que há de errado com a chave de serviço, ou null se parece correta. */
export function serviceKeyProblem(): string | null {
  const key = serviceKey();
  if (!key) return "Falta a chave SUPABASE_SERVICE_ROLE_KEY no servidor (a “Secret key” do Supabase, que começa com sb_secret_).";
  if (key.startsWith("sb_publishable_"))
    return "A variável SUPABASE_SERVICE_ROLE_KEY recebeu a chave pública (sb_publishable_). Troque pela “Secret key” do Supabase, que começa com sb_secret_.";
  if (key.length < 30) return "A chave SUPABASE_SERVICE_ROLE_KEY parece incompleta. Copie a “Secret key” inteira com o botão Copy do Supabase.";
  return null;
}

/**
 * Cliente com service role — IGNORA RLS. Use só no servidor, para tarefas de
 * backend (coleta, IA, excluir conta). Nunca importe em componentes client.
 */
export function createAdminClient() {
  if (!SUPABASE_URL || serviceKeyProblem()) return null;
  return createClient(SUPABASE_URL, serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

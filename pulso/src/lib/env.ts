/**
 * Variáveis de ambiente. Só NEXT_PUBLIC_* chegam ao navegador.
 * A service role key é lida apenas em código de servidor (ver supabase/admin.ts).
 */
// Aceita o nome antigo (ANON_KEY) e o atual do Supabase (PUBLISHABLE_KEY); ignora "/" no fim da URL.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
// Se a variável receber o trecho "NOME=valor" colado inteiro (ex.: do botão Connect), fica só o valor.
const cleanKey = (v: string) => (v.includes("=") ? (v.split("=").pop() ?? "") : v).replace(/["'\s]/g, "");
export const SUPABASE_ANON_KEY = cleanKey(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
);

export function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 30;
}

export function siteUrl(fallbackOrigin?: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin || "http://localhost:3000").replace(/\/$/, "");
}

/** Fuso usado para agrupar por dia/hora. Brasil não tem horário de verão desde 2019. */
export const APP_TIMEZONE = "America/Belem";
export const APP_TZ_OFFSET_MINUTES = -180;

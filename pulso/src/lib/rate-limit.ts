import "server-only";

/**
 * Limitador simples em memória (janela deslizante) para ações sensíveis como
 * login e recuperação de senha. Vale por instância do servidor; em produção com
 * várias instâncias, trocar por Redis/Upstash mantendo a mesma assinatura.
 * O Supabase Auth também aplica os próprios limites.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - list[0])) / 1000) };
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 10_000) hits.clear();
  return { ok: true, retryAfterSec: 0 };
}

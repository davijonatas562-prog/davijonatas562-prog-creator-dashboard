import type { Platform } from "@/lib/types";

/**
 * Gerador de legenda determinístico (placeholder).
 * TODO: trocar pelo LLM na rota /api/caption mantendo esta assinatura.
 */
export function generateCaption(idea: string, platforms: Platform[]): string {
  const clean = idea.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const first = clean.split(/[.!?]/)[0];
  const hook = first.length > 90 ? `${first.slice(0, 87)}…` : first;
  const cta = platforms.includes("linkedin")
    ? "O que você faria diferente? Comenta aqui."
    : "Salva pra não perder 🔖 e manda pra quem precisa ver isso.";
  const tags = ["#marketingdigital", "#inteligenciaartificial", "#criadordeconteudo"];
  if (platforms.includes("tiktok")) tags.push("#fyp");
  return `${hook} 👇\n\n${clean}\n\n${cta}\n\n${tags.join(" ")}`;
}

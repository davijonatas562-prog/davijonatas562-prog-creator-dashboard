import type { Mention, Sentiment } from "@/lib/types";

/**
 * PULSO DE REPUTAÇÃO (0–100)
 *
 * Mede a percepção observada NAS FONTES MONITORADAS — não é pesquisa eleitoral
 * nem amostra representativa da população.
 *
 *   1. Cada menção classificada recebe um peso
 *        w = confiança × relevância da fonte × peso temporal
 *      onde o peso temporal decai pela metade a cada meia-duração do período
 *      (menções recentes pesam mais).
 *   2. Valor de sentimento: positiva = +1, negativa = −1, neutra/mista = 0.
 *      Indeterminadas e não classificadas ficam de fora.
 *   3. Saldo ponderado  S = Σ(w·v) / Σw   (de −1 a +1).
 *   4. Fator de volume  k = n / (n + 25): com poucas menções o índice é puxado
 *      para 50 (neutro), evitando conclusões fortes a partir de poucos dados.
 *   5. Pulso = 50 + 50 · S · k.
 *
 * Tendência: diferença para o período anterior de mesma duração.
 *   ≥ +3 pontos  → Reputação em alta
 *   ≤ −3 pontos  → Reputação em queda
 *   entre os dois → Reputação estável
 * Abaixo de MIN_SAMPLE menções classificadas em qualquer dos períodos → dados insuficientes.
 */
export const MIN_SAMPLE = 15;
export const VOLUME_K = 25;
export const TREND_THRESHOLD = 3;

const VALUE: Record<Sentiment, number | null> = {
  positive: 1,
  negative: -1,
  neutral: 0,
  mixed: 0,
  undetermined: null,
};

export interface ReputationResult {
  score: number | null;
  sample: number;
  netSentiment: number | null; // S, de −1 a +1
  avgConfidence: number | null;
}

export function reputationIndex(mentions: Mention[], start: Date, end: Date): ReputationResult {
  const halfLife = Math.max((end.getTime() - start.getTime()) / 2, 1);
  let sw = 0;
  let swv = 0;
  let n = 0;
  let conf = 0;
  for (const m of mentions) {
    if (!m.sentiment) continue;
    const v = VALUE[m.sentiment];
    if (v === null) continue;
    const age = Math.max(0, end.getTime() - new Date(m.publishedAt).getTime());
    const w = m.confidence * m.relevance * Math.pow(0.5, age / halfLife);
    if (w <= 0) continue;
    sw += w;
    swv += w * v;
    n += 1;
    conf += m.confidence;
  }
  if (n === 0 || sw === 0) return { score: null, sample: 0, netSentiment: null, avgConfidence: null };
  const S = swv / sw;
  const k = n / (n + VOLUME_K);
  const score = Math.round(Math.min(100, Math.max(0, 50 + 50 * S * k)));
  return { score, sample: n, netSentiment: S, avgConfidence: conf / n };
}

export type Trend = "up" | "stable" | "down" | "insufficient";

export function reputationTrend(current: ReputationResult, previous: ReputationResult): { trend: Trend; delta: number | null } {
  if (current.score === null || previous.score === null || current.sample < MIN_SAMPLE || previous.sample < MIN_SAMPLE) {
    return { trend: "insufficient", delta: current.score !== null && previous.score !== null ? current.score - previous.score : null };
  }
  const delta = current.score - previous.score;
  return { trend: delta >= TREND_THRESHOLD ? "up" : delta <= -TREND_THRESHOLD ? "down" : "stable", delta };
}

export const TREND_LABEL: Record<Trend, string> = {
  up: "Reputação em alta",
  stable: "Reputação estável",
  down: "Reputação em queda",
  insufficient: "Dados insuficientes",
};

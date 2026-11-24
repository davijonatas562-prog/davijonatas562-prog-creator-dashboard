import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { BatchSchema, type Analysis } from "./schema";
import { SYSTEM_PROMPT, buildUserMessage, type CorrectionExample, type PromptMention } from "./prompt";

export const SENTIMENT_MODEL = process.env.PULSO_SENTIMENT_MODEL || "claude-opus-5-5";
export const BATCH_SIZE = 20;

export function isSentimentConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export class SentimentError extends Error {}

/**
 * Classifica até BATCH_SIZE menções numa chamada, com saída estruturada (JSON validado por Zod).
 * Retorna só os resultados cujo id veio na entrada; ids faltantes ficam sem classificação.
 */
export async function classifyBatch(input: {
  profile: { publicName: string; office: string | null; municipality: string | null; state: string | null };
  knownTopics: string[];
  corrections: CorrectionExample[];
  mentions: PromptMention[];
}): Promise<Analysis[]> {
  if (!input.mentions.length) return [];
  const client = new Anthropic();
  let response;
  try {
    // fallbacks "default": se o modelo recusar por política, a API reexecuta no modelo de reserva
    response = await client.beta.messages.parse({
      model: SENTIMENT_MODEL,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: betaZodOutputFormat(BatchSchema) },
      messages: [{ role: "user", content: buildUserMessage(input) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new SentimentError("Chave da API de IA inválida.");
    if (error instanceof Anthropic.RateLimitError) throw new SentimentError("Limite de uso da IA atingido. Tente em alguns minutos.");
    if (error instanceof Anthropic.APIError) throw new SentimentError(`Falha na API de IA (${error.status ?? "rede"}).`);
    throw error;
  }
  if (response.stop_reason === "refusal") throw new SentimentError("A IA recusou analisar este lote.");
  if (response.stop_reason === "max_tokens") throw new SentimentError("Resposta da IA incompleta. Tente com menos menções.");
  const parsed = response.parsed_output;
  if (!parsed) throw new SentimentError("A IA devolveu um formato inesperado.");

  const ids = new Set(input.mentions.map((m) => m.id));
  return parsed.results
    .filter((r) => ids.has(r.id))
    .map((r) => {
      const confidence = Math.min(1, Math.max(0, r.confidence));
      // regra de segurança: baixa confiança vira indeterminada
      const sentiment = confidence < 0.45 ? "undetermined" : r.sentiment;
      return { ...r, confidence, sentiment, topic: r.topic.trim().slice(0, 60) };
    });
}

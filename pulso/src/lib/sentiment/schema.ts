import { z } from "zod";

/** Resultado da IA para uma menção. Espelha as colunas de sentiment_analysis. */
export const AnalysisSchema = z.object({
  id: z.string().describe("O id da menção, exatamente como recebido."),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed", "undetermined"]),
  topic: z.string().describe("Assunto principal em 1 a 3 palavras, em português (ex.: Saúde, Infraestrutura)."),
  emotion: z.string().describe("Emoção predominante em uma palavra (ex.: indignação, gratidão, preocupação, ironia, neutra)."),
  stance: z.enum(["praise", "criticism", "neutral", "question", "unknown"]),
  irony: z.boolean(),
  sarcasm: z.boolean(),
  context: z.string().describe("Uma frase curta explicando o contexto e o porquê da classificação."),
  confidence: z.number().describe("Confiança de 0 a 1."),
});

export const BatchSchema = z.object({ results: z.array(AnalysisSchema) });

export type Analysis = z.infer<typeof AnalysisSchema>;

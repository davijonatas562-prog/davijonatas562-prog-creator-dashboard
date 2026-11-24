import type { SourceId } from "@/lib/types";

/**
 * Contrato de um conector (Fase 3). Cada fonte implementa esta interface num
 * módulo próprio e é registrada em um mapa SourceId → Connector. O job de
 * sincronização roda no servidor com a service role, grava em `mentions` e
 * atualiza `social_connections` (status, last_synced_at, mentions_found, last_error).
 */
export interface RawMention {
  externalId: string;
  url: string | null;
  authorName: string | null;
  authorHandle: string | null;
  content: string;
  contentType: "post" | "comment" | "video" | "article" | "reply" | "other";
  publishedAt: Date;
  reach: number | null;
  engagement: number | null;
}

export interface SearchQuery {
  include: string[]; // termos principais + relacionados
  context: string[]; // termos de contexto para desambiguar homônimos
  exclude: string[]; // nomes/termos que devem ser descartados
  since: Date;
}

export interface Connector {
  id: SourceId;
  /** Verifica credenciais/config sem coletar nada. */
  validate(config: Record<string, unknown>, credentials: Record<string, string> | null): Promise<{ ok: boolean; error?: string }>;
  /** Coleta apenas conteúdo público, respeitando limites de taxa da plataforma. */
  fetchMentions(query: SearchQuery, config: Record<string, unknown>, credentials: Record<string, string> | null): AsyncIterable<RawMention>;
}

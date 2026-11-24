import type { ContentType, SearchTerm, SourceId } from "@/lib/types";

/**
 * Contrato dos conectores. Cada fonte implementa `collect`, que devolve menções
 * normalizadas. A gravação, a deduplicação e o status ficam no motor (sync.ts).
 * Conectores só acessam conteúdo público ou autorizado pelo dono da conta.
 */
export interface RawMention {
  externalId: string;
  url: string | null;
  authorName: string | null;
  content: string;
  contentType: ContentType;
  publishedAt: Date;
  reach: number | null;
  engagement: number | null;
  relevance: number; // 0–1
}

export interface ProfileQuery {
  id: string;
  publicName: string;
  terms: SearchTerm[];
  nicknames: string[];
}

export interface ConnectorContext {
  profile: ProfileQuery;
  config: Record<string, unknown>;
  secrets: Record<string, unknown> | null;
  since: Date;
}

export interface Connector {
  id: SourceId;
  /** O que falta no servidor para funcionar (ex.: chave de API). null = pronto. */
  missingSetup(): string | null;
  /** O que falta na configuração da organização (ex.: nenhum feed). null = pronto. */
  missingConfig(config: Record<string, unknown>, hasSecrets: boolean): string | null;
  collect(ctx: ConnectorContext): Promise<RawMention[]>;
}

export class ConnectorError extends Error {}

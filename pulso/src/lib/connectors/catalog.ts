import type { SourceId } from "@/lib/types";

/**
 * Catálogo de fontes. Espelha a tabela social_sources.
 * `implemented` indica se o conector de backend já existe. Enquanto for false,
 * a fonte aparece como "não conectada" — nunca simulamos resultados.
 */
export interface SourceDefinition {
  id: SourceId;
  name: string;
  shortName: string;
  category: "social" | "video" | "news" | "blog" | "forum" | "other";
  accessMethod: string;
  implemented: boolean;
}

export const SOURCES: SourceDefinition[] = [
  { id: "instagram", name: "Instagram", shortName: "Instagram", category: "social", accessMethod: "Instagram Graph API (conta profissional do político)", implemented: true },
  { id: "facebook", name: "Facebook", shortName: "Facebook", category: "social", accessMethod: "Graph API (Página do próprio político)", implemented: true },
  { id: "x", name: "X / Twitter", shortName: "X", category: "social", accessMethod: "API oficial do X", implemented: false },
  { id: "tiktok", name: "TikTok", shortName: "TikTok", category: "video", accessMethod: "TikTok Research API", implemented: false },
  { id: "youtube", name: "YouTube", shortName: "YouTube", category: "video", accessMethod: "YouTube Data API v3", implemented: true },
  { id: "threads", name: "Threads", shortName: "Threads", category: "social", accessMethod: "Threads API", implemented: false },
  { id: "google_news", name: "Busca de notícias", shortName: "Notícias", category: "news", accessMethod: "API de notícias licenciada (GNews)", implemented: true },
  { id: "news_sites", name: "Sites de notícias", shortName: "Sites", category: "news", accessMethod: "RSS/Atom públicos", implemented: true },
  { id: "blogs", name: "Blogs", shortName: "Blogs", category: "blog", accessMethod: "RSS/Atom públicos", implemented: true },
  { id: "reddit", name: "Reddit", shortName: "Reddit", category: "forum", accessMethod: "API oficial do Reddit", implemented: false },
  { id: "other", name: "Outras fontes públicas", shortName: "Outras", category: "other", accessMethod: "Feeds públicos", implemented: false },
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SourceId, SourceDefinition>;

export function sourceName(id: string) {
  return SOURCE_BY_ID[id as SourceId]?.shortName ?? id;
}

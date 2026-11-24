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
  { id: "instagram", name: "Instagram", shortName: "Instagram", category: "social", accessMethod: "Instagram Graph API", implemented: false },
  { id: "facebook", name: "Facebook", shortName: "Facebook", category: "social", accessMethod: "Graph API (páginas públicas)", implemented: false },
  { id: "x", name: "X / Twitter", shortName: "X", category: "social", accessMethod: "API oficial do X", implemented: false },
  { id: "tiktok", name: "TikTok", shortName: "TikTok", category: "video", accessMethod: "TikTok Research API", implemented: false },
  { id: "youtube", name: "YouTube", shortName: "YouTube", category: "video", accessMethod: "YouTube Data API v3", implemented: false },
  { id: "threads", name: "Threads", shortName: "Threads", category: "social", accessMethod: "Threads API", implemented: false },
  { id: "google_news", name: "Google News", shortName: "Google News", category: "news", accessMethod: "RSS público", implemented: false },
  { id: "news_sites", name: "Sites de notícias", shortName: "Sites", category: "news", accessMethod: "RSS/Atom públicos", implemented: false },
  { id: "blogs", name: "Blogs", shortName: "Blogs", category: "blog", accessMethod: "RSS/Atom públicos", implemented: false },
  { id: "reddit", name: "Reddit", shortName: "Reddit", category: "forum", accessMethod: "API oficial do Reddit", implemented: false },
  { id: "other", name: "Outras fontes públicas", shortName: "Outras", category: "other", accessMethod: "Feeds públicos", implemented: false },
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SourceId, SourceDefinition>;

export function sourceName(id: string) {
  return SOURCE_BY_ID[id as SourceId]?.shortName ?? id;
}

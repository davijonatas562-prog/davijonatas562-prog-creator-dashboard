import { matchesProfile } from "@/lib/terms";
import { fetchJson, orQuery, primaryTerms } from "./http";
import { hashId } from "./rss";
import { ConnectorError, type Connector } from "./types";

/**
 * Busca de notícias via GNews (gnews.io), API com plano comercial.
 * Usamos título, resumo e link — o texto completo fica no site do veículo.
 */
type GNewsResponse = {
  articles?: { title?: string; description?: string; url?: string; publishedAt?: string; source?: { name?: string } }[];
  errors?: string[] | Record<string, string>;
};

export const gnewsConnector: Connector = {
  id: "google_news",
  missingSetup: () => (process.env.GNEWS_API_KEY ? null : "Falta configurar a chave GNEWS_API_KEY no servidor."),
  missingConfig: () => null,
  async collect({ profile, since }) {
    const key = process.env.GNEWS_API_KEY!;
    const q = orQuery(primaryTerms(profile));
    const params = new URLSearchParams({ q, lang: "pt", country: "br", max: "25", sortby: "publishedAt", from: since.toISOString().replace(/\.\d+Z$/, "Z"), apikey: key });
    const data = await fetchJson<GNewsResponse>(`https://gnews.io/api/v4/search?${params}`);
    if (data.errors) throw new ConnectorError(`GNews: ${Array.isArray(data.errors) ? data.errors.join("; ") : Object.values(data.errors).join("; ")}`);
    return (data.articles ?? [])
      .filter((a) => a.url && a.title && matchesProfile(`${a.title}. ${a.description ?? ""}`, profile.terms, profile.nicknames).matched)
      .map((a) => ({
        externalId: hashId(a.url!),
        url: a.url!,
        authorName: a.source?.name ?? null,
        content: a.description ? `${a.title} — ${a.description}` : a.title!,
        contentType: "article" as const,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
        reach: null,
        engagement: null,
        relevance: 0.9,
      }));
  },
};

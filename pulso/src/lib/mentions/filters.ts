import type { ContentType, MentionItem, MentionStatus, Sentiment, SourceId } from "@/lib/types";
import { resolvePeriod, type Period } from "@/lib/metrics/period";
import { normalize } from "@/lib/terms";

export const PAGE_SIZE = 25;

export interface MentionFilters {
  q: string;
  sources: SourceId[];
  sentiments: (Sentiment | "unclassified")[];
  topic: string | null;
  minRelevance: number | null; // 0–1
  contentType: ContentType | null;
  status: MentionStatus | null;
  savedOnly: boolean;
  sort: "recent" | "relevance" | "reach";
  page: number;
  period: Period;
}

const list = (v?: string) => (v ? v.split(",").filter(Boolean) : []);

export function parseMentionFilters(sp: Record<string, string | undefined>, now: Date): MentionFilters {
  const rel = sp.relevancia ? Number(sp.relevancia) : null;
  return {
    q: (sp.q ?? "").slice(0, 120),
    sources: list(sp.rede) as SourceId[],
    sentiments: list(sp.sentimento) as MentionFilters["sentiments"],
    topic: sp.assunto || null,
    minRelevance: rel !== null && rel >= 0 && rel <= 1 ? rel : null,
    contentType: (sp.tipo as ContentType) || null,
    status: (sp.status as MentionStatus) || null,
    savedOnly: sp.salvas === "1",
    sort: sp.ordem === "relevancia" ? "relevance" : sp.ordem === "alcance" ? "reach" : "recent",
    page: Math.max(1, Math.min(400, Number(sp.pagina) || 1)),
    period: resolvePeriod({ periodo: sp.periodo ?? "30d", de: sp.de, ate: sp.ate }, now),
  };
}

/** Filtro em memória — usado pela demonstração (o modo real filtra no banco). */
export function filterInMemory(items: MentionItem[], f: MentionFilters) {
  const q = normalize(f.q);
  const out = items.filter((m) => {
    const t = new Date(m.publishedAt).getTime();
    if (t < f.period.start.getTime() || t >= f.period.end.getTime()) return false;
    if (f.sources.length && !f.sources.includes(m.sourceId)) return false;
    if (f.sentiments.length) {
      const s = m.analysis?.sentiment ?? "unclassified";
      if (!f.sentiments.includes(s)) return false;
    }
    if (f.topic && m.topic !== f.topic) return false;
    if (f.minRelevance !== null && m.relevance < f.minRelevance) return false;
    if (f.contentType && m.contentType !== f.contentType) return false;
    if (f.status && m.status !== f.status) return false;
    if (f.savedOnly && !m.saved) return false;
    if (q && !normalize(`${m.content ?? ""} ${m.authorName ?? ""}`).includes(q)) return false;
    return true;
  });
  out.sort((a, b) =>
    f.sort === "relevance"
      ? b.relevance - a.relevance || b.publishedAt.localeCompare(a.publishedAt)
      : f.sort === "reach"
        ? (b.reach ?? -1) - (a.reach ?? -1)
        : b.publishedAt.localeCompare(a.publishedAt),
  );
  const start = (f.page - 1) * PAGE_SIZE;
  return { items: out.slice(start, start + PAGE_SIZE), total: out.length };
}

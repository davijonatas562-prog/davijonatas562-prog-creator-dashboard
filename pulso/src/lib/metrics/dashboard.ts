import type { Mention, Sentiment, SourceId } from "@/lib/types";
import { bucketEdges, MS, type Period } from "./period";
import { reputationIndex, reputationTrend, type Trend } from "./reputation";

/**
 * Agrega uma lista de menções nos números do dashboard. É a mesma função para
 * o modo real e para a demonstração — a diferença está só na origem das menções.
 * Retorna apenas dados serializáveis (vai do Server Component para o client).
 */

export interface Kpi {
  current: number;
  previous: number;
}

export interface TimelinePoint {
  t: string; // ISO do início do bucket
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  other: number; // mista + indeterminada + não classificada
  /** saldo (pos − neg) / classificadas, em pontos percentuais; null se < 3 classificadas */
  net: number | null;
}

export interface TopicStat {
  topic: string;
  count: number;
  previous: number;
  growth: number | null; // variação relativa vs período anterior
  positive: number;
  negative: number;
  neutral: number;
  other: number;
}

export interface HighlightMention {
  id: string;
  sourceId: SourceId;
  publishedAt: string;
  sentiment: Sentiment | null;
  topic: string | null;
  content: string | null;
  authorName: string | null;
  url: string | null;
  reach: number | null;
  engagement: number | null;
}

export interface DashboardData {
  period: { key: string; label: string; start: string; end: string; bucket: "hour" | "day"; from: string; to: string };
  kpis: {
    total: Kpi;
    positive: Kpi;
    negative: Kpi;
    neutral: Kpi;
    mixed: Kpi;
    undetermined: Kpi;
    reach: Kpi & { coverage: number }; // coverage = fração das menções com alcance informado
  };
  /** saldo de sentimento em pontos percentuais: (pos − neg) / classificadas */
  netSentiment: { current: number | null; previous: number | null };
  reputation: {
    score: number | null;
    previous: number | null;
    delta: number | null;
    trend: Trend;
    sample: number;
    avgConfidence: number | null;
  };
  timeline: TimelinePoint[];
  networks: { sourceId: SourceId; count: number; share: number }[];
  topics: TopicStat[];
  trendingTopics: TopicStat[];
  heatmap: number[][]; // [diaDaSemana 0=dom][hora 0–23], fuso do app
  highlights: HighlightMention[];
}

const SENTS: Sentiment[] = ["positive", "negative", "neutral", "mixed", "undetermined"];

function countBy(ms: Mention[]) {
  const c = { positive: 0, negative: 0, neutral: 0, mixed: 0, undetermined: 0 };
  for (const m of ms) if (m.sentiment) c[m.sentiment] += 1;
  return c;
}

function net(ms: Mention[]): number | null {
  let pos = 0;
  let neg = 0;
  let classified = 0;
  for (const m of ms) {
    if (!m.sentiment || m.sentiment === "undetermined") continue;
    classified += 1;
    if (m.sentiment === "positive") pos += 1;
    else if (m.sentiment === "negative") neg += 1;
  }
  return classified < 3 ? null : ((pos - neg) / classified) * 100;
}

function inRange(m: Mention, a: Date, b: Date) {
  const t = new Date(m.publishedAt).getTime();
  return t >= a.getTime() && t < b.getTime();
}

export function computeDashboard(all: Mention[], period: Period): DashboardData {
  const cur = all.filter((m) => inRange(m, period.start, period.end));
  const prev = all.filter((m) => inRange(m, period.prevStart, period.prevEnd));

  const cc = countBy(cur);
  const pc = countBy(prev);
  const reachOf = (ms: Mention[]) => ms.reduce((s, m) => s + (m.reach ?? 0), 0);
  const withReach = cur.filter((m) => m.reach !== null).length;

  // Pulso de Reputação
  const repCur = reputationIndex(cur, period.start, period.end);
  const repPrev = reputationIndex(prev, period.prevStart, period.prevEnd);
  const { trend, delta } = reputationTrend(repCur, repPrev);

  // Linha do tempo
  const edges = bucketEdges(period);
  const step = period.bucket === "hour" ? MS.HOUR : MS.DAY;
  const first = edges[0]?.getTime() ?? period.start.getTime();
  const buckets: Mention[][] = edges.map(() => []);
  for (const m of cur) {
    const i = Math.floor((new Date(m.publishedAt).getTime() - first) / step);
    if (i >= 0 && i < buckets.length) buckets[i].push(m);
  }
  const timeline: TimelinePoint[] = buckets.map((ms, i) => {
    const c = countBy(ms);
    return {
      t: edges[i].toISOString(),
      total: ms.length,
      positive: c.positive,
      negative: c.negative,
      neutral: c.neutral,
      other: ms.length - c.positive - c.negative - c.neutral,
      net: net(ms),
    };
  });

  // Redes
  const byNet = new Map<SourceId, number>();
  for (const m of cur) byNet.set(m.sourceId, (byNet.get(m.sourceId) ?? 0) + 1);
  const networks = [...byNet.entries()]
    .map(([sourceId, count]) => ({ sourceId, count, share: cur.length ? count / cur.length : 0 }))
    .sort((a, b) => b.count - a.count);

  // Assuntos
  const topicMap = new Map<string, TopicStat>();
  const getTopic = (name: string) => {
    let t = topicMap.get(name);
    if (!t) {
      t = { topic: name, count: 0, previous: 0, growth: null, positive: 0, negative: 0, neutral: 0, other: 0 };
      topicMap.set(name, t);
    }
    return t;
  };
  for (const m of cur) {
    if (!m.topic) continue;
    const t = getTopic(m.topic);
    t.count += 1;
    if (m.sentiment === "positive") t.positive += 1;
    else if (m.sentiment === "negative") t.negative += 1;
    else if (m.sentiment === "neutral") t.neutral += 1;
    else t.other += 1;
  }
  for (const m of prev) if (m.topic && topicMap.has(m.topic)) getTopic(m.topic).previous += 1;
  const topics = [...topicMap.values()]
    .map((t) => ({ ...t, growth: t.previous === 0 ? null : (t.count - t.previous) / t.previous }))
    .sort((a, b) => b.count - a.count);

  // Em alta: crescimento relevante com volume mínimo (evita "+300%" de 1 → 4 menções)
  const minVolume = Math.max(5, Math.round(cur.length * 0.03));
  const trendingTopics = topics
    .filter((t) => t.count >= minVolume && (t.growth === null ? t.count >= minVolume * 2 : t.growth > 0.1))
    .sort((a, b) => (b.growth ?? 10) - (a.growth ?? 10))
    .slice(0, 4);

  // Heatmap dia × hora (fuso do app)
  const heatmap = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const m of cur) {
    const local = new Date(new Date(m.publishedAt).getTime() + MS.OFFSET);
    heatmap[local.getUTCDay()][local.getUTCHours()] += 1;
  }

  // Destaques: maior alcance/engajamento ponderado pela relevância
  const highlights = [...cur]
    .filter((m) => m.content)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 6)
    .map((m) => ({
      id: m.id,
      sourceId: m.sourceId,
      publishedAt: m.publishedAt,
      sentiment: m.sentiment,
      topic: m.topic,
      content: m.content,
      authorName: m.authorName,
      url: m.url,
      reach: m.reach,
      engagement: m.engagement,
    }));

  return {
    period: {
      key: period.key,
      label: period.label,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      bucket: period.bucket,
      from: period.from,
      to: period.to,
    },
    kpis: {
      total: { current: cur.length, previous: prev.length },
      positive: { current: cc.positive, previous: pc.positive },
      negative: { current: cc.negative, previous: pc.negative },
      neutral: { current: cc.neutral, previous: pc.neutral },
      mixed: { current: cc.mixed, previous: pc.mixed },
      undetermined: { current: cc.undetermined, previous: pc.undetermined },
      reach: { current: reachOf(cur), previous: reachOf(prev), coverage: cur.length ? withReach / cur.length : 0 },
    },
    netSentiment: { current: net(cur), previous: net(prev) },
    reputation: {
      score: repCur.score,
      previous: repPrev.score,
      delta,
      trend,
      sample: repCur.sample,
      avgConfidence: repCur.avgConfidence,
    },
    timeline,
    networks,
    topics: topics.slice(0, 8),
    trendingTopics,
    heatmap,
    highlights,
  };
}

function score(m: Mention) {
  return ((m.reach ?? 0) + 20 * (m.engagement ?? 0)) * m.relevance;
}

export { SENTS };

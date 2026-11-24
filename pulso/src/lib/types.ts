/** Tipos de domínio do PULSO. Os nomes em inglês espelham os enums do banco. */

export type Sentiment = "positive" | "negative" | "neutral" | "mixed" | "undetermined";

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Positiva",
  negative: "Negativa",
  neutral: "Neutra",
  mixed: "Mista",
  undetermined: "Indeterminada",
};

export type SourceId =
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "youtube"
  | "threads"
  | "google_news"
  | "news_sites"
  | "blogs"
  | "reddit"
  | "other";

export type ConnectionStatus = "not_connected" | "pending" | "connected" | "error" | "paused";

export type MemberRole = "owner" | "admin" | "analyst" | "viewer";

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  analyst: "Analista",
  viewer: "Leitor",
};

/** Menção já normalizada para os cálculos (vinda do banco ou da demonstração). */
export interface Mention {
  id: string;
  sourceId: SourceId;
  publishedAt: string; // ISO
  sentiment: Sentiment | null; // null = ainda não classificada
  confidence: number; // 0–1
  topic: string | null;
  reach: number | null;
  engagement: number | null;
  relevance: number; // 0–1, relevância da fonte/publicação
  content: string | null;
  authorName: string | null;
  url: string | null;
}

export interface MonitoredProfile {
  id: string;
  fullName: string;
  publicName: string;
  office: string | null;
  municipality: string | null;
  state: string | null;
  party: string | null;
  photoUrl: string | null;
  status: "active" | "paused";
}

export interface SourceStatus {
  sourceId: SourceId;
  status: ConnectionStatus;
  lastSyncedAt: string | null;
  mentionsFound: number;
  lastError: string | null;
}

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

export type MentionStatus = "new" | "in_review" | "responded" | "resolved" | "ignored";
export const STATUS_LABEL: Record<MentionStatus, string> = {
  new: "Nova",
  in_review: "Em análise",
  responded: "Respondida",
  resolved: "Resolvida",
  ignored: "Ignorada",
};

export type ContentType = "post" | "comment" | "video" | "article" | "reply" | "other";
export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  post: "Publicação",
  comment: "Comentário",
  video: "Vídeo",
  article: "Matéria",
  reply: "Resposta",
  other: "Outro",
};

export type Stance = "praise" | "criticism" | "neutral" | "question" | "unknown";
export const STANCE_LABEL: Record<Stance, string> = {
  praise: "Elogio",
  criticism: "Crítica",
  neutral: "Informativo",
  question: "Pergunta/cobrança",
  unknown: "Não identificado",
};

export type SearchTermKind = "primary" | "related" | "context" | "exclude";
export const TERM_KIND_LABEL: Record<SearchTermKind, string> = {
  primary: "Termos principais",
  related: "Palavras relacionadas",
  context: "Termos de contexto",
  exclude: "Excluir da busca",
};

export interface SearchTerm {
  term: string;
  kind: SearchTermKind;
}

export interface ProfileWithTerms extends MonitoredProfile {
  nicknames: string[];
  terms: SearchTerm[];
}

/** Menção completa para a central de menções. */
export interface MentionItem {
  id: string;
  sourceId: SourceId;
  publishedAt: string;
  content: string | null;
  authorName: string | null;
  url: string | null;
  contentType: ContentType;
  reach: number | null;
  engagement: number | null;
  relevance: number;
  status: MentionStatus;
  topic: string | null;
  saved: boolean;
  analysis: {
    sentiment: Sentiment;
    confidence: number;
    emotion: string | null;
    stance: Stance;
    irony: boolean;
    sarcasm: boolean;
    context: string | null;
    isManual: boolean;
    model: string | null;
  } | null;
}

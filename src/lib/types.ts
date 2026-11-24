/**
 * Tipos de domínio do painel. Cada página consome um destes contratos;
 * hoje os dados vêm de `src/lib/data/*` (mock), amanhã de APIs/DB.
 */

export type Platform = "instagram" | "tiktok" | "youtube" | "linkedin" | "x";

export type HookCategory =
  | "curiosidade"
  | "contraste"
  | "autoridade"
  | "lista"
  | "polêmica"
  | "história";

export interface Hook {
  id: string;
  /** Transcrição literal dos primeiros segundos do vídeo de origem */
  transcript: string;
  /** Versão templatizada com {placeholders} */
  template: string;
  category: HookCategory;
  sourceHandle: string;
  sourceUrl: string;
  views: number;
  savedAt: string; // ISO
  timesUsed: number;
}

export interface DailyMetric {
  date: string; // ISO (yyyy-mm-dd)
  views: number;
  saves: number;
  follows: number;
}

export interface Reel {
  id: string;
  hook: string;
  postedAt: string;
  views: number;
  saves: number;
  shares: number;
  follows: number;
  /** views / mediana dos últimos 30 reels do perfil */
  multiplier: number;
}

export interface CompetitorReel {
  id: string;
  handle: string;
  hook: string;
  views: number;
  likes: number;
  comments: number;
  multiplier: number;
  postedAt: string;
  url: string;
}

export type PostStatus = "agendado" | "publicado" | "rascunho" | "falhou";

export interface ScheduledPost {
  id: string;
  title: string;
  caption: string;
  platforms: Platform[];
  scheduledFor: string; // ISO datetime
  status: PostStatus;
}

export type CalendarStatus = "ideia" | "roteirizado" | "gravado" | "publicado";

export interface CalendarEntry {
  id: string;
  date: string; // yyyy-mm-dd
  hook: string;
  angle: string;
  format: "reel" | "carrossel" | "story" | "short";
  status: CalendarStatus;
  /** true quando a entrada foi criada pelo comando /script */
  fromScript: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string; // ISO datetime
  summary: string;
  /** 0–100: quão bem a notícia vira um hook */
  hookScore: number;
  suggestedHook: string;
  tags: string[];
}

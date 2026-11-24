import type { CalendarEntry } from "@/lib/types";

/** Entradas com fromScript=true foram geradas pelo comando /script (hook + ângulo). */
export const calendarEntries: CalendarEntry[] = [
  { id: "e1", date: "2026-11-18", hook: "Bastidores: 12 reels em 1 dia", angle: "Processo / bastidor", format: "reel", status: "publicado", fromScript: false },
  { id: "e2", date: "2026-11-19", hook: "Por que vídeo de político dá 200 views", angle: "Dor do público", format: "reel", status: "publicado", fromScript: true },
  { id: "e3", date: "2026-11-20", hook: "3 IAs que todo assessor precisa usar", angle: "Lista utilitária", format: "carrossel", status: "publicado", fromScript: true },
  { id: "e4", date: "2026-11-21", hook: "Prefeito, pare de postar foto de obra assim", angle: "Polêmica + correção", format: "reel", status: "publicado", fromScript: true },
  { id: "e5", date: "2026-11-23", hook: "O ChatGPT agora faz seu santinho em 10s", angle: "Notícia de IA → aplicação", format: "reel", status: "publicado", fromScript: true },
  { id: "e6", date: "2026-11-25", hook: "IA que faz santinho — parte 2", angle: "Continuação de heater", format: "reel", status: "gravado", fromScript: true },
  { id: "e7", date: "2026-11-26", hook: "Erro nº 1 de prefeitura no Instagram", angle: "Autoridade técnica", format: "reel", status: "roteirizado", fromScript: true },
  { id: "e8", date: "2026-11-27", hook: "O que mudou no algoritmo em novembro", angle: "Notícia + opinião", format: "carrossel", status: "roteirizado", fromScript: true },
  { id: "e9", date: "2026-11-28", hook: "Antes: 200 views. Depois: 400 mil.", angle: "Case de cliente", format: "reel", status: "ideia", fromScript: true },
  { id: "e10", date: "2026-11-30", hook: "Perguntas da semana", angle: "Comunidade", format: "story", status: "ideia", fromScript: false },
  { id: "e11", date: "2026-12-01", hook: "Ninguém tá falando do que a OpenAI lançou", angle: "Notícia de IA → aplicação", format: "short", status: "ideia", fromScript: true },
  { id: "e12", date: "2026-12-02", hook: "Quanto custa um social media pra campanha", angle: "Transparência de preço", format: "reel", status: "ideia", fromScript: true },
  { id: "e13", date: "2026-12-04", hook: "3 erros de vereador no primeiro ano", angle: "Lista + autoridade", format: "carrossel", status: "ideia", fromScript: true },
];

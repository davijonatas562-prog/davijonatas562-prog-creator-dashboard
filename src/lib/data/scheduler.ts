import type { Platform, ScheduledPost } from "@/lib/types";

export const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YT Shorts",
  linkedin: "LinkedIn",
  x: "X",
};

export const scheduledPosts: ScheduledPost[] = [
  {
    id: "p1",
    title: "IA que faz santinho em 10s — parte 2",
    caption: "A parte 2 que vocês pediram 👇 Testei 4 IAs pra criar material de campanha…",
    platforms: ["instagram", "tiktok", "youtube"],
    scheduledFor: "2026-11-25T12:00:00-03:00",
    status: "agendado",
  },
  {
    id: "p2",
    title: "Erro nº 1 de prefeitura no Instagram",
    caption: "Se a sua prefeitura posta assim, tá jogando alcance fora…",
    platforms: ["instagram", "linkedin"],
    scheduledFor: "2026-11-26T18:30:00-03:00",
    status: "agendado",
  },
  {
    id: "p3",
    title: "Thread: o que mudou no algoritmo",
    caption: "",
    platforms: ["x", "linkedin"],
    scheduledFor: "2026-11-27T09:00:00-03:00",
    status: "rascunho",
  },
  {
    id: "p4",
    title: "O ChatGPT agora faz seu santinho em 10 segundos",
    caption: "Testei e fiquei chocado. Salva pra não perder 🔖",
    platforms: ["instagram", "tiktok", "youtube"],
    scheduledFor: "2026-11-23T12:00:00-03:00",
    status: "publicado",
  },
];

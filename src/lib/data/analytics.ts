import type { DailyMetric, Reel } from "@/lib/types";

// Série determinística de 30 dias (até 24/11/2026) — sem Math.random para não quebrar hidratação.
const base = [
  41, 38, 45, 52, 47, 60, 58, 49, 55, 63, 71, 66, 59, 62, 80, 95, 88, 74, 69, 77, 84, 92, 110, 138, 121,
  104, 98, 131, 176, 154,
];

export const dailyMetrics: DailyMetric[] = base.map((k, i) => {
  const d = new Date(Date.UTC(2026, 9, 26 + i)); // 26/10 → 24/11
  return {
    date: d.toISOString().slice(0, 10),
    views: k * 1000 + ((i * 7919) % 4000),
    saves: Math.round(k * 21 + ((i * 131) % 300)),
    follows: Math.round(k * 4.2 + ((i * 53) % 60)),
  };
});

export const weeklyReels: Reel[] = [
  { id: "r1", hook: "O ChatGPT agora faz seu santinho em 10 segundos (testei)", postedAt: "2026-11-23", views: 412_000, saves: 18_400, shares: 9_100, follows: 3_250, multiplier: 6.8 },
  { id: "r2", hook: "Prefeito, pare de postar foto de obra assim", postedAt: "2026-11-21", views: 236_000, saves: 11_200, shares: 4_300, follows: 1_840, multiplier: 3.9 },
  { id: "r3", hook: "3 IAs que todo assessor de comunicação precisa usar", postedAt: "2026-11-20", views: 189_000, saves: 14_900, shares: 2_700, follows: 1_120, multiplier: 3.1 },
  { id: "r4", hook: "Por que vídeo de político dá 200 views (e como resolver)", postedAt: "2026-11-19", views: 74_000, saves: 2_100, shares: 640, follows: 380, multiplier: 1.2 },
  { id: "r5", hook: "Bastidores: gravando 12 reels em 1 dia", postedAt: "2026-11-18", views: 41_000, saves: 820, shares: 210, follows: 140, multiplier: 0.7 },
];

/** Um reel é "heater" quando faz ≥ 2× a mediana do perfil. */
export const HEATER_THRESHOLD = 2;

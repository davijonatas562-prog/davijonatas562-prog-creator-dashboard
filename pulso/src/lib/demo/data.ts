import "server-only";
import type { ContentType, Mention, MentionItem, MentionStatus, MonitoredProfile, ProfileWithTerms, Sentiment, SourceId, SourceStatus, Stance } from "@/lib/types";
import { MS } from "@/lib/metrics/period";

/**
 * MODO DEMONSTRAÇÃO — dados 100% fictícios.
 * Gerados em memória, de forma determinística por hora (a mesma hora sempre
 * produz as mesmas menções). Nunca são gravados no banco nem misturados com
 * dados reais. Nenhuma menção tem link: não existem publicações originais.
 */

export const DEMO_NOTICE = "Ambiente de demonstração. Os dados apresentados são fictícios.";

export const DEMO_PROFILES: MonitoredProfile[] = [
  {
    id: "demo-joao-silva",
    fullName: "João Carlos da Silva",
    publicName: "Prefeito João Silva",
    office: "Prefeito",
    municipality: "Nova Aurora",
    state: "AP",
    party: null,
    photoUrl: null,
    status: "active",
  },
];

const DAYS = 62; // cobre 30 dias + período anterior

type TopicDef = { name: string; weight: number; pos: number; neg: number };
const TOPICS: TopicDef[] = [
  { name: "Saúde", weight: 18, pos: 0.42, neg: 0.26 },
  { name: "Infraestrutura", weight: 17, pos: 0.24, neg: 0.44 },
  { name: "Educação", weight: 14, pos: 0.48, neg: 0.18 },
  { name: "Segurança", weight: 10, pos: 0.2, neg: 0.38 },
  { name: "Transporte", weight: 8, pos: 0.22, neg: 0.36 },
  { name: "Cultura e eventos", weight: 12, pos: 0.62, neg: 0.1 },
  { name: "Meio ambiente", weight: 7, pos: 0.36, neg: 0.22 },
  { name: "Gestão fiscal", weight: 6, pos: 0.25, neg: 0.3 },
  { name: "Assistência social", weight: 8, pos: 0.5, neg: 0.16 },
];

const SOURCE_MIX: [SourceId, number, number][] = [
  // fonte, peso, relevância
  ["instagram", 30, 0.75],
  ["facebook", 26, 0.7],
  ["youtube", 4, 0.7],
  ["google_news", 9, 0.95],
  ["news_sites", 9, 0.9],
  ["blogs", 4, 0.6],
];

// YouTube parou há 2 dias (cota da API esgotada) — a demo mostra o erro e para de gerar menções do YouTube
const YT_ERROR_HOURS_AGO = 50;

const TEXTS: Record<string, Partial<Record<Sentiment, string[]>>> = {
  Saúde: {
    positive: [
      "Fui atendida rápido no posto do bairro Esperança, equipe muito atenciosa. Parabéns à saúde de Nova Aurora.",
      "O mutirão de exames da prefeitura ajudou muito minha mãe. Finalmente conseguiu fazer a consulta.",
    ],
    negative: [
      "Três semanas esperando consulta com especialista. Prefeito João Silva, cadê a fila andando?",
      "Faltou remédio de pressão de novo na farmácia básica. Assim não dá.",
    ],
    neutral: ["Prefeitura divulga horários de vacinação nas unidades de saúde nesta semana."],
    mixed: ["O posto novo ficou bonito, mas ainda falta médico no turno da noite."],
  },
  Infraestrutura: {
    positive: ["A pavimentação da rua Castanheira ficou ótima, depois de anos de lama. Valeu, prefeito."],
    negative: [
      "Parabéns, prefeito João Silva, pela piscina pública na avenida Beira-Rio. Só faltou avisar que era buraco.",
      "Égua, tá de parabéns a prefeitura: três meses pra tapar um buraco e ainda tapou o errado.",
      "Depois da chuva a avenida Beira-Rio virou um mar de buraco. Ninguém aparece pra resolver.",
      "Rua do Igarapé sem iluminação há 15 dias. Moradores com medo de sair à noite.",
      "Mais uma vez cratera na entrada do bairro Novo Horizonte. Vai esperar alguém se acidentar?",
    ],
    neutral: ["Secretaria de Obras informa interdição parcial da rua Principal para drenagem."],
    mixed: ["Começaram a tapar os buracos, mas só na rua da frente. As de trás continuam iguais."],
  },
  Educação: {
    positive: [
      "Escola municipal reformada e com climatização. Meus filhos estão adorando.",
      "Entrega dos kits escolares foi organizada e no prazo. Ponto para a gestão.",
    ],
    negative: ["Transporte escolar atrasou a semana inteira na zona rural. As crianças perdendo aula."],
    neutral: ["Matrículas da rede municipal abertas até sexta, informa a Secretaria de Educação."],
  },
  Segurança: {
    negative: [
      "Praça central sem iluminação e cheia de assalto. Precisa de mais ronda.",
      "Videomonitoramento prometido ainda não saiu do papel.",
    ],
    positive: ["A nova base da guarda municipal no centro deu outra sensação de segurança."],
    neutral: ["Prefeitura e polícia discutem plano integrado de segurança para o fim de ano."],
  },
  Transporte: {
    negative: ["Ônibus da linha Centro–Aeroporto sempre lotado e atrasado. Até quando?"],
    positive: ["Gostei do novo abrigo de ônibus com cobertura, faz diferença no sol de meio-dia."],
    neutral: ["Horário dos ônibus muda no feriado; confira a tabela divulgada pela prefeitura."],
  },
  "Cultura e eventos": {
    positive: [
      "Festival de Nova Aurora foi lindo demais! Cidade cheia, comércio bombando.",
      "Que orgulho ver os artistas da terra no palco principal. Mais eventos assim!",
    ],
    negative: ["Gastaram com show enquanto o posto está sem remédio? Prioridade errada."],
    neutral: ["Programação do festival de fim de ano é divulgada pela prefeitura."],
  },
  "Meio ambiente": {
    positive: ["Mutirão de limpeza do igarapé reuniu muita gente. Iniciativa bonita."],
    negative: ["Lixo acumulado na feira há dias. A coleta não passou."],
    neutral: ["Prefeitura anuncia novo cronograma de coleta seletiva por bairro."],
  },
  "Gestão fiscal": {
    neutral: ["Câmara analisa o projeto da Lei Orçamentária enviado pelo Executivo municipal."],
    negative: ["Cadê a transparência dos gastos com combustível? Portal desatualizado."],
    positive: ["Prefeitura em dia com os salários dos servidores, isso precisa ser reconhecido."],
  },
  "Assistência social": {
    positive: ["O programa de cestas para famílias em vulnerabilidade chegou certinho aqui no bairro."],
    negative: ["Cadastro no CRAS demorando demais, fila desde as 5 da manhã."],
    neutral: ["CRAS amplia horário de atendimento para atualização do cadastro."],
  },
};

const AUTHORS = ["Perfil público", "Morador(a) de Nova Aurora", "Portal Aurora Notícias", "Rádio Comunitária", "Blog Cidade Viva", "Canal local"];

/** PRNG determinístico (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

// perfil horário de atividade (fuso local): madrugada baixa, picos no almoço e à noite
const HOUR_SHAPE = [0.15, 0.08, 0.05, 0.04, 0.05, 0.12, 0.35, 0.6, 0.8, 0.9, 0.95, 1.05, 1.25, 1.1, 0.9, 0.85, 0.9, 1.0, 1.25, 1.55, 1.7, 1.5, 1.0, 0.45];

function sentimentFor(r: () => number, t: TopicDef, hoursAgo: number): Sentiment {
  let pos = t.pos;
  let neg = t.neg;
  // Cenário fictício: chuva forte há ~4 dias → críticas de infraestrutura disparam
  if (t.name === "Infraestrutura" && hoursAgo < 96) {
    neg = 0.66;
    pos = 0.1;
  }
  // Saúde melhorando nas últimas 2 semanas
  if (t.name === "Saúde" && hoursAgo < 14 * 24) {
    pos += 0.12;
    neg -= 0.08;
  }
  const x = r();
  if (x < pos) return "positive";
  if (x < pos + neg) return "negative";
  if (x < pos + neg + 0.06) return "mixed";
  if (x < pos + neg + 0.1) return "undetermined";
  return "neutral";
}

function textFor(r: () => number, topic: string, s: Sentiment) {
  const bank = TEXTS[topic] ?? {};
  const list = bank[s] ?? bank.neutral ?? Object.values(bank)[0] ?? ["Menção ao Prefeito João Silva."];
  return list[Math.floor(r() * list.length)];
}

/** Textos fictícios irônicos — a análise de demonstração os marca como ironia/sarcasmo. */
const IRONIC = new Set([
  "Parabéns, prefeito João Silva, pela piscina pública na avenida Beira-Rio. Só faltou avisar que era buraco.",
  "Égua, tá de parabéns a prefeitura: três meses pra tapar um buraco e ainda tapou o errado.",
]);

export function generateDemoMentions(now: Date): Mention[] {
  const nowHour = Math.floor(now.getTime() / MS.HOUR);
  const out: Mention[] = [];
  for (let h = DAYS * 24; h >= 0; h--) {
    const hourIdx = nowHour - h;
    const r = rng(hourIdx * 2654435761);
    const localHour = new Date(hourIdx * MS.HOUR + MS.OFFSET).getUTCHours();
    const weekday = new Date(hourIdx * MS.HOUR + MS.OFFSET).getUTCDay();
    // crescimento leve ao longo do tempo + pico do cenário de infraestrutura
    let rate = 3.1 * HOUR_SHAPE[localHour] * (weekday === 0 ? 0.8 : 1) * (1 + (DAYS * 24 - h) / (DAYS * 24) * 0.25);
    if (h < 96) rate *= 1.35;
    const count = Math.floor(rate + r());
    for (let i = 0; i < count; i++) {
      let topicDefs = TOPICS.map((t) => [t, t.weight] as [TopicDef, number]);
      if (h < 96) topicDefs = topicDefs.map(([t, w]) => [t, t.name === "Infraestrutura" ? w * 2.6 : w]);
      const topic = pick(r, topicDefs);
      let mix = SOURCE_MIX;
      if (h < YT_ERROR_HOURS_AGO) mix = mix.filter(([s]) => s !== "youtube");
      const [sourceId, , relevance] = pick(r, mix.map((m) => [m, m[1]] as [typeof m, number]));
      const sentiment = sentimentFor(r, topic, h);
      const minute = Math.floor(r() * 60);
      const isNews = sourceId === "google_news" || sourceId === "news_sites";
      const baseReach = isNews ? 4000 : sourceId === "tiktok" ? 2500 : sourceId === "instagram" ? 1400 : 700;
      const reach = Math.round(baseReach * Math.exp((r() - 0.3) * 2.4));
      const confidence = sentiment === "undetermined" ? 0.35 + r() * 0.2 : 0.62 + r() * 0.36;
      out.push({
        id: `demo-${hourIdx}-${i}`,
        sourceId,
        publishedAt: new Date(hourIdx * MS.HOUR + minute * 60_000).toISOString(),
        sentiment,
        confidence: Math.round(confidence * 100) / 100,
        topic: topic.name,
        reach: sourceId === "blogs" && r() < 0.5 ? null : reach,
        engagement: isNews ? null : Math.round(reach * (0.02 + r() * 0.07)),
        relevance,
        content: textFor(r, topic.name, sentiment),
        authorName: isNews ? AUTHORS[2 + Math.floor(r() * 2)] : AUTHORS[Math.floor(r() * 2)],
        url: null,
      });
    }
  }
  return out;
}

export function demoSourceStatuses(now: Date, mentions: Mention[]): SourceStatus[] {
  const counts = new Map<string, number>();
  for (const m of mentions) counts.set(m.sourceId, (counts.get(m.sourceId) ?? 0) + 1);
  const synced = new Date(Math.floor(now.getTime() / (15 * 60_000)) * 15 * 60_000).toISOString();
  const status = (id: SourceId, s: SourceStatus["status"], extra: Partial<SourceStatus> = {}): SourceStatus => ({
    sourceId: id,
    status: s,
    lastSyncedAt: s === "connected" ? synced : null,
    mentionsFound: counts.get(id) ?? 0,
    lastError: null,
    ...extra,
  });
  return [
    status("instagram", "connected"),
    status("facebook", "connected"),
    status("x", "not_connected"),
    status("tiktok", "not_connected"),
    status("youtube", "connected", {
      lastSyncedAt: new Date(now.getTime() - YT_ERROR_HOURS_AGO * MS.HOUR).toISOString(),
      lastError: "Cota diária da API do YouTube esgotada. A coleta volta automaticamente amanhã.",
    }),
    status("threads", "not_connected"),
    status("google_news", "connected"),
    status("news_sites", "connected"),
    status("blogs", "connected"),
    status("reddit", "not_connected"),
    status("other", "not_connected"),
  ];
}

export const DEMO_PROFILES_FULL: ProfileWithTerms[] = [
  {
    ...DEMO_PROFILES[0],
    nicknames: ["Joãozinho da Aurora"],
    terms: [
      { term: "Prefeito João Silva", kind: "primary" },
      { term: "João Silva", kind: "primary" },
      { term: "Prefeitura de Nova Aurora", kind: "related" },
      { term: "Nova Aurora", kind: "context" },
      { term: "João Silva Neto", kind: "exclude" },
    ],
  },
];

const EMOTIONS: Record<Sentiment, string[]> = {
  positive: ["gratidão", "satisfação", "orgulho", "esperança"],
  negative: ["indignação", "frustração", "preocupação", "cansaço"],
  neutral: ["neutra"],
  mixed: ["ambivalência", "expectativa"],
  undetermined: ["incerta"],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const TYPE_BY_SOURCE: Partial<Record<SourceId, ContentType>> = {
  google_news: "article",
  news_sites: "article",
  blogs: "article",
  youtube: "video",
  tiktok: "video",
};

/** Menções detalhadas da demonstração (mesma base do dashboard + campos da análise fictícia). */
export function generateDemoItems(now: Date): MentionItem[] {
  return generateDemoMentions(now).map((m) => {
    const h = hash(m.id);
    const ironic = !!m.content && IRONIC.has(m.content);
    const sentiment: Sentiment = ironic ? "negative" : (m.sentiment ?? "undetermined");
    const stance: Stance =
      sentiment === "positive" ? "praise" : sentiment === "negative" ? (m.content?.includes("?") ? "question" : "criticism") : sentiment === "neutral" ? "neutral" : "unknown";
    const ageH = (now.getTime() - new Date(m.publishedAt).getTime()) / MS.HOUR;
    const status: MentionStatus =
      sentiment === "negative" && ageH > 72 ? (["responded", "resolved", "in_review", "new"] as const)[h % 4] : h % 17 === 0 ? "in_review" : "new";
    const unclassified = h % 41 === 0;
    return {
      id: m.id,
      sourceId: m.sourceId,
      publishedAt: m.publishedAt,
      content: m.content,
      authorName: m.authorName,
      url: null,
      contentType: TYPE_BY_SOURCE[m.sourceId] ?? (h % 3 === 0 ? "comment" : "post"),
      reach: m.reach,
      engagement: m.engagement,
      relevance: m.relevance,
      status,
      topic: m.topic,
      saved: h % 29 === 0,
      analysis: unclassified
        ? null
        : {
            sentiment,
            confidence: ironic ? 0.78 : m.confidence,
            emotion: ironic ? "indignação" : EMOTIONS[sentiment][h % EMOTIONS[sentiment].length],
            stance,
            irony: ironic,
            sarcasm: ironic && h % 2 === 0,
            context: ironic
              ? "Elogio aparente usado de forma irônica para criticar a conservação das vias."
              : `Menção fictícia sobre ${m.topic?.toLowerCase() ?? "a gestão"} (${sentiment === "positive" ? "avaliação favorável" : sentiment === "negative" ? "reclamação" : sentiment === "neutral" ? "conteúdo informativo" : "sentido ambíguo"}).`,
            isManual: false,
            model: "demonstração",
          },
    };
  });
}

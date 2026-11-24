import type { NewsItem } from "@/lib/types";

/** As 12 fontes monitoradas pelo agregador. */
export const newsSources = [
  "The Verge",
  "TechCrunch",
  "OpenAI Blog",
  "Anthropic News",
  "Google AI Blog",
  "Hugging Face",
  "The Information",
  "Ben's Bites",
  "Hacker News",
  "MIT Tech Review",
  "Tecnoblog",
  "Canaltech",
] as const;

export const newsItems: NewsItem[] = [
  { id: "n1", title: "OpenAI lança modo de vídeo em tempo real para todos os usuários gratuitos", source: "OpenAI Blog", url: "https://openai.com/", publishedAt: "2026-11-24T08:12:00-03:00", summary: "Recurso antes restrito ao plano Pro agora chega à versão gratuita, com limite diário.", hookScore: 94, suggestedHook: "A OpenAI acabou de liberar de graça o recurso que custava R$ 1.000 por mês.", tags: ["lançamento", "grátis"] },
  { id: "n2", title: "Meta testa IA que edita Reels automaticamente a partir do roteiro", source: "The Verge", url: "https://theverge.com/", publishedAt: "2026-11-24T06:40:00-03:00", summary: "Ferramenta interna corta, legenda e adiciona b-roll com base num texto.", hookScore: 91, suggestedHook: "O Instagram vai editar seus Reels sozinho — e isso muda o jogo pra quem cria.", tags: ["instagram", "edição"] },
  { id: "n3", title: "TSE publica regras para uso de IA nas eleições de 2026", source: "Tecnoblog", url: "https://tecnoblog.net/", publishedAt: "2026-11-23T19:05:00-03:00", summary: "Deepfakes proibidos e rotulagem obrigatória para conteúdo sintético em campanhas.", hookScore: 88, suggestedHook: "Político, se você usa IA nos seus vídeos, presta atenção nessa regra nova do TSE.", tags: ["política", "regulação"] },
  { id: "n4", title: "Anthropic anuncia agentes que operam o navegador por horas sem supervisão", source: "Anthropic News", url: "https://anthropic.com/", publishedAt: "2026-11-23T14:30:00-03:00", summary: "Novos agentes conseguem concluir tarefas longas de pesquisa e preenchimento.", hookScore: 79, suggestedHook: "Deixei uma IA trabalhando 6 horas sozinha. Olha o que ela entregou.", tags: ["agentes"] },
  { id: "n5", title: "Google integra geração de imagens ao Google Fotos no Brasil", source: "Canaltech", url: "https://canaltech.com.br/", publishedAt: "2026-11-23T11:00:00-03:00", summary: "Usuários brasileiros podem editar e criar imagens via prompt dentro do app.", hookScore: 76, suggestedHook: "Seu celular já tem um Photoshop com IA escondido — e quase ninguém sabe.", tags: ["google", "imagem"] },
  { id: "n6", title: "Estudo: vídeos com legenda gerada por IA retêm 18% mais", source: "MIT Tech Review", url: "https://technologyreview.com/", publishedAt: "2026-11-22T17:20:00-03:00", summary: "Análise de 2 milhões de vídeos curtos aponta ganho de retenção nos 3 primeiros segundos.", hookScore: 72, suggestedHook: "Um estudo com 2 milhões de vídeos descobriu o detalhe que segura as pessoas.", tags: ["pesquisa", "retenção"] },
  { id: "n7", title: "Hugging Face lança modelo de voz open-source que clona sotaques regionais", source: "Hugging Face", url: "https://huggingface.co/", publishedAt: "2026-11-22T10:45:00-03:00", summary: "Modelo leve roda localmente e suporta português com variações regionais.", hookScore: 64, suggestedHook: "Essa IA gratuita imita até sotaque do Norte. Testei com a minha voz.", tags: ["open-source", "voz"] },
  { id: "n8", title: "Startup de IA para edição de vídeo levanta US$ 80 milhões", source: "TechCrunch", url: "https://techcrunch.com/", publishedAt: "2026-11-22T09:00:00-03:00", summary: "Rodada série B para ferramenta que transforma vídeos longos em cortes.", hookScore: 48, suggestedHook: "Investidores colocaram US$ 80 milhões nessa ideia. Você pode usar hoje.", tags: ["investimento"] },
  { id: "n9", title: "Discussão: modelos pequenos já superam GPT-4 em tarefas de código", source: "Hacker News", url: "https://news.ycombinator.com/", publishedAt: "2026-11-21T22:10:00-03:00", summary: "Thread com benchmarks comunitários sobre modelos abaixo de 10B parâmetros.", hookScore: 35, suggestedHook: "Uma IA que cabe no seu notebook já bate o GPT-4.", tags: ["modelos"] },
  { id: "n10", title: "Newsletter: os 5 lançamentos de IA que importam nesta semana", source: "Ben's Bites", url: "https://bensbites.com/", publishedAt: "2026-11-21T08:00:00-03:00", summary: "Curadoria semanal com destaque para ferramentas de criação de conteúdo.", hookScore: 58, suggestedHook: "5 lançamentos de IA dessa semana que você vai querer testar hoje.", tags: ["curadoria"] },
  { id: "n11", title: "Google DeepMind mostra modelo que gera vídeos de 2 minutos com áudio", source: "Google AI Blog", url: "https://blog.google/", publishedAt: "2026-11-20T15:30:00-03:00", summary: "Demonstração inclui diálogos sincronizados e consistência de personagem.", hookScore: 83, suggestedHook: "Esse vídeo inteiro foi feito por IA. Até a voz. Repara no final.", tags: ["vídeo", "google"] },
  { id: "n12", title: "Bastidores: como a OpenAI negocia com veículos de mídia", source: "The Information", url: "https://theinformation.com/", publishedAt: "2026-11-20T12:00:00-03:00", summary: "Reportagem detalha valores e cláusulas de acordos de licenciamento.", hookScore: 29, suggestedHook: "Quanto a OpenAI paga pra usar notícias? Os números vazaram.", tags: ["mídia"] },
];

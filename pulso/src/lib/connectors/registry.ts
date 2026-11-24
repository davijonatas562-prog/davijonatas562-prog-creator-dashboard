import type { SourceId } from "@/lib/types";
import type { Connector } from "./types";
import { blogsConnector, newsSitesConnector } from "./rss";
import { gnewsConnector } from "./gnews";
import { youtubeConnector } from "./youtube";
import { facebookConnector, instagramConnector } from "./meta";

/** Conectores implementados. Fontes fora deste mapa aparecem como indisponíveis. */
export const CONNECTORS: Partial<Record<SourceId, Connector>> = {
  news_sites: newsSitesConnector,
  blogs: blogsConnector,
  google_news: gnewsConnector,
  youtube: youtubeConnector,
  facebook: facebookConnector,
  instagram: instagramConnector,
};

/** Por que uma fonte não tem conector — exibido com transparência na tela de Fontes. */
export const UNAVAILABLE_REASON: Partial<Record<SourceId, string>> = {
  x: "A API do X cobra planos pagos para busca. Ativamos quando houver contrato com a API oficial.",
  tiktok: "A API de pesquisa do TikTok é restrita a pesquisadores aprovados. Não há acesso comercial oficial no momento.",
  threads: "A busca por palavra-chave do Threads exige aprovação da Meta. Entra junto com o app da Meta aprovado.",
  reddit: "A API do Reddit exige cadastro de app e acordo para uso comercial. Previsto para uma próxima versão.",
  other: "Use “Sites de notícias” ou “Blogs” para cadastrar qualquer feed RSS público.",
};

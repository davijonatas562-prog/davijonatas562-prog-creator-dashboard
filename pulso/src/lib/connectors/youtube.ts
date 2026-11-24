import { matchesProfile } from "@/lib/terms";
import { fetchJson, orQuery, primaryTerms } from "./http";
import type { Connector, RawMention } from "./types";

/**
 * YouTube Data API v3: vídeos públicos que citam o perfil e os comentários
 * públicos desses vídeos. Cota diária gratuita: busca = 100 unidades, demais = 1.
 */
const API = "https://www.googleapis.com/youtube/v3";

type SearchRes = { items?: { id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string } }[] };
type VideosRes = { items?: { id: string; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[] };
type CommentsRes = {
  items?: { id: string; snippet?: { topLevelComment?: { snippet?: { textDisplay?: string; textOriginal?: string; publishedAt?: string; likeCount?: number } }; totalReplyCount?: number } }[];
};

export const youtubeConnector: Connector = {
  id: "youtube",
  missingSetup: () => (process.env.YOUTUBE_API_KEY ? null : "Falta configurar a chave YOUTUBE_API_KEY no servidor."),
  missingConfig: () => null,
  async collect({ profile, since }) {
    const key = process.env.YOUTUBE_API_KEY!;
    const search = await fetchJson<SearchRes>(
      `${API}/search?${new URLSearchParams({ part: "snippet", type: "video", order: "date", maxResults: "15", regionCode: "BR", relevanceLanguage: "pt", q: orQuery(primaryTerms(profile), 120).replace(/ OR /g, "|"), publishedAfter: since.toISOString(), key })}`,
    );
    const videos = (search.items ?? []).filter(
      (v) => v.id?.videoId && matchesProfile(`${v.snippet?.title ?? ""}. ${v.snippet?.description ?? ""}`, profile.terms, profile.nicknames).matched,
    );
    if (!videos.length) return [];

    const ids = videos.map((v) => v.id!.videoId!);
    const stats = await fetchJson<VideosRes>(`${API}/videos?${new URLSearchParams({ part: "statistics", id: ids.join(","), key })}`);
    const statById = new Map((stats.items ?? []).map((s) => [s.id, s.statistics]));

    const out: RawMention[] = [];
    for (const v of videos) {
      const id = v.id!.videoId!;
      const st = statById.get(id);
      out.push({
        externalId: `video:${id}`,
        url: `https://www.youtube.com/watch?v=${id}`,
        authorName: v.snippet?.channelTitle ?? null,
        content: `${v.snippet?.title ?? ""}${v.snippet?.description ? ` — ${v.snippet.description.slice(0, 600)}` : ""}`,
        contentType: "video",
        publishedAt: v.snippet?.publishedAt ? new Date(v.snippet.publishedAt) : new Date(),
        reach: st?.viewCount ? Number(st.viewCount) : null,
        engagement: st ? Number(st.likeCount ?? 0) + Number(st.commentCount ?? 0) : null,
        relevance: 0.75,
      });
    }

    // Comentários públicos dos vídeos encontrados (sem nome do autor: o foco é o assunto, não a pessoa)
    await Promise.all(
      ids.slice(0, 8).map(async (videoId) => {
        try {
          const c = await fetchJson<CommentsRes>(
            `${API}/commentThreads?${new URLSearchParams({ part: "snippet", videoId, maxResults: "40", order: "time", textFormat: "plainText", key })}`,
          );
          for (const t of c.items ?? []) {
            const s = t.snippet?.topLevelComment?.snippet;
            const textC = s?.textOriginal ?? s?.textDisplay;
            if (!textC || !s?.publishedAt || new Date(s.publishedAt) < since) continue;
            out.push({
              externalId: `comment:${t.id}`,
              url: `https://www.youtube.com/watch?v=${videoId}&lc=${t.id}`,
              authorName: null,
              content: textC.slice(0, 2000),
              contentType: "comment",
              publishedAt: new Date(s.publishedAt),
              reach: null,
              engagement: (s.likeCount ?? 0) + (t.snippet?.totalReplyCount ?? 0),
              relevance: 0.55,
            });
          }
        } catch {
          // comentários desativados no vídeo: ignora
        }
      }),
    );
    return out;
  },
};

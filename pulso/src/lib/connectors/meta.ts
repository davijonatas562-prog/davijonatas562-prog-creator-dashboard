import { fetchJson } from "./http";
import { ConnectorError, type Connector, type RawMention } from "./types";

/**
 * Instagram e Facebook via Graph API oficial da Meta.
 * Só funciona para contas que o dono autorizou (login com Facebook): Página do
 * Facebook e conta profissional do Instagram ligada a ela. Lemos:
 *  - comentários nos posts do próprio perfil;
 *  - publicações em que o perfil foi marcado (quando a permissão permitir).
 * A Meta não permite buscar por nome em todo o Instagram/Facebook.
 */
export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
export const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "instagram_basic",
  "instagram_manage_comments",
  "business_management",
];

export function isMetaConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export interface MetaAccount {
  profileId: string; // perfil monitorado do PULSO
  pageId: string;
  pageName: string;
  igUserId: string | null;
  igUsername: string | null;
}

export function accountsFromConfig(config: Record<string, unknown>): MetaAccount[] {
  return Array.isArray(config.accounts) ? (config.accounts as MetaAccount[]) : [];
}

type Paged<T> = { data?: T[]; error?: { message?: string; code?: number } };
type FbPost = { id: string; created_time: string; permalink_url?: string; comments?: Paged<FbComment> };
type FbComment = { id: string; message?: string; created_time: string; like_count?: number; permalink_url?: string };
type IgMedia = { id: string; timestamp: string; permalink?: string; comments_count?: number };
type IgComment = { id: string; text?: string; timestamp: string; like_count?: number };
type IgTag = { id: string; caption?: string; timestamp: string; permalink?: string; like_count?: number; comments_count?: number; username?: string };

async function graph<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const data = await fetchJson<T & { error?: { message?: string; code?: number } }>(
    `${GRAPH}/${path}?${new URLSearchParams({ ...params, access_token: token })}`,
  ).catch((e) => {
    throw e instanceof ConnectorError ? new ConnectorError(`Meta: ${e.message}`) : e;
  });
  if (data.error) {
    const code = data.error.code;
    throw new ConnectorError(
      code === 190 ? "A autorização da Meta expirou. Reconecte a conta." : `Meta: ${data.error.message ?? "erro desconhecido"}`,
    );
  }
  return data;
}

function tokenFor(secrets: Record<string, unknown> | null, pageId: string) {
  const pages = (secrets?.pages ?? {}) as Record<string, string>;
  const t = pages[pageId];
  if (!t) throw new ConnectorError("Conta sem autorização. Reconecte com o Facebook.");
  return t;
}

export const facebookConnector: Connector = {
  id: "facebook",
  missingSetup: () => (isMetaConfigured() ? null : "Falta configurar o app da Meta (META_APP_ID e META_APP_SECRET)."),
  missingConfig: (config, hasSecrets) => (accountsFromConfig(config).length && hasSecrets ? null : "Conecte a Página do Facebook do político."),
  async collect({ profile, config, secrets, since }) {
    const acc = accountsFromConfig(config).find((a) => a.profileId === profile.id);
    if (!acc) return [];
    const token = tokenFor(secrets, acc.pageId);
    const sinceUnix = String(Math.floor(since.getTime() / 1000));
    const posts = await graph<Paged<FbPost>>(`${acc.pageId}/posts`, token, {
      fields: "id,created_time,permalink_url,comments.limit(50).order(reverse_chronological){id,message,created_time,like_count,permalink_url}",
      since: sinceUnix,
      limit: "25",
    });
    const out: RawMention[] = [];
    for (const p of posts.data ?? []) {
      for (const c of p.comments?.data ?? []) {
        if (!c.message || new Date(c.created_time) < since) continue;
        out.push({
          externalId: `comment:${c.id}`,
          url: c.permalink_url ?? p.permalink_url ?? null,
          authorName: null,
          content: c.message.slice(0, 2000),
          contentType: "comment",
          publishedAt: new Date(c.created_time),
          reach: null,
          engagement: c.like_count ?? null,
          relevance: 0.6,
        });
      }
    }
    return out;
  },
};

export const instagramConnector: Connector = {
  id: "instagram",
  missingSetup: () => (isMetaConfigured() ? null : "Falta configurar o app da Meta (META_APP_ID e META_APP_SECRET)."),
  missingConfig: (config, hasSecrets) =>
    accountsFromConfig(config).some((a) => a.igUserId) && hasSecrets ? null : "Conecte a conta profissional do Instagram (ligada à Página do Facebook).",
  async collect({ profile, config, secrets, since }) {
    const acc = accountsFromConfig(config).find((a) => a.profileId === profile.id && a.igUserId);
    if (!acc) return [];
    const token = tokenFor(secrets, acc.pageId);
    const media = await graph<Paged<IgMedia>>(`${acc.igUserId}/media`, token, { fields: "id,timestamp,permalink,comments_count", limit: "20" });
    const out: RawMention[] = [];
    const recent = (media.data ?? []).filter((m) => (m.comments_count ?? 0) > 0).slice(0, 12);
    await Promise.all(
      recent.map(async (m) => {
        const comments = await graph<Paged<IgComment>>(`${m.id}/comments`, token, { fields: "id,text,timestamp,like_count", limit: "50" });
        for (const c of comments.data ?? []) {
          if (!c.text || new Date(c.timestamp) < since) continue;
          out.push({
            externalId: `comment:${c.id}`,
            url: m.permalink ?? null,
            authorName: null,
            content: c.text.slice(0, 2000),
            contentType: "comment",
            publishedAt: new Date(c.timestamp),
            reach: null,
            engagement: c.like_count ?? null,
            relevance: 0.6,
          });
        }
      }),
    );
    // Publicações de terceiros que marcaram o perfil
    try {
      const tags = await graph<Paged<IgTag>>(`${acc.igUserId}/tags`, token, { fields: "id,caption,timestamp,permalink,like_count,comments_count,username", limit: "25" });
      for (const t of tags.data ?? []) {
        if (!t.caption || new Date(t.timestamp) < since) continue;
        out.push({
          externalId: `tag:${t.id}`,
          url: t.permalink ?? null,
          authorName: null,
          content: t.caption.slice(0, 2000),
          contentType: "post",
          publishedAt: new Date(t.timestamp),
          reach: null,
          engagement: (t.like_count ?? 0) + (t.comments_count ?? 0),
          relevance: 0.7,
        });
      }
    } catch {
      // sem permissão para marcações: segue só com comentários
    }
    return out;
  },
};

import "server-only";
import { fetchJson } from "./http";
import { GRAPH, GRAPH_VERSION, META_SCOPES } from "./meta";
import { ConnectorError } from "./types";

export function metaAuthUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${p}`;
}

export interface MetaPage {
  pageId: string;
  pageName: string;
  igUserId: string | null;
  igUsername: string | null;
  token: string;
}

/** Troca o código por token de longa duração e lista as Páginas (com token próprio de cada Página). */
export async function exchangeCodeForPages(code: string, redirectUri: string): Promise<MetaPage[]> {
  const base = { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET! };
  const short = await fetchJson<{ access_token?: string; error?: { message?: string } }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({ ...base, redirect_uri: redirectUri, code })}`,
  );
  if (!short.access_token) throw new ConnectorError(short.error?.message ?? "A Meta não devolveu o token.");
  const long = await fetchJson<{ access_token?: string }>(
    `${GRAPH}/oauth/access_token?${new URLSearchParams({ ...base, grant_type: "fb_exchange_token", fb_exchange_token: short.access_token })}`,
  );
  const userToken = long.access_token ?? short.access_token;
  const pages = await fetchJson<{
    data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[];
    error?: { message?: string };
  }>(`${GRAPH}/me/accounts?${new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100", access_token: userToken })}`);
  if (pages.error) throw new ConnectorError(pages.error.message ?? "Falha ao listar as Páginas.");
  return (pages.data ?? []).map((p) => ({
    pageId: p.id,
    pageName: p.name,
    igUserId: p.instagram_business_account?.id ?? null,
    igUsername: p.instagram_business_account?.username ?? null,
    token: p.access_token,
  }));
}

import { ConnectorError } from "./types";

const UA = "PULSO-Monitor/1.0 (+monitoramento de reputacao; conteudo publico)";

export async function fetchText(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*", ...init.headers },
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (e) {
    throw new ConnectorError(e instanceof Error && e.name === "TimeoutError" ? "Tempo esgotado ao consultar a fonte." : "Não foi possível acessar a fonte.");
  }
  if (!res.ok) throw new ConnectorError(`A fonte respondeu com erro HTTP ${res.status}.`);
  return res.text();
}

export async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const text = await fetchText(url, { ...init, headers: { Accept: "application/json", ...init.headers } }, timeoutMs).catch((e) => {
    throw e;
  });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ConnectorError("Resposta inválida da fonte.");
  }
}

/** Remove tags HTML e entidades comuns de resumos de feeds. */
export function stripHtml(s: string) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Monta uma busca "A" OR "B" com os termos principais (limite de caracteres da API). */
export function orQuery(terms: string[], maxLen = 190) {
  const parts: string[] = [];
  for (const t of terms) {
    const q = `"${t.replace(/"/g, "")}"`;
    if ([...parts, q].join(" OR ").length > maxLen) break;
    parts.push(q);
  }
  return parts.join(" OR ");
}

export function primaryTerms(p: { terms: { term: string; kind: string }[]; nicknames: string[]; publicName: string }) {
  const list = [...p.terms.filter((t) => t.kind === "primary").map((t) => t.term), ...p.nicknames];
  return list.length ? list : [p.publicName];
}

/** Bloqueia endereços internos em URLs informadas pelo usuário (proteção contra SSRF). */
export function assertPublicUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new ConnectorError("Endereço inválido.");
  }
  if (!/^https?:$/.test(u.protocol)) throw new ConnectorError("Use um endereço http(s).");
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
    h === "[::1]" ||
    h.startsWith("[fc") ||
    h.startsWith("[fd") ||
    h === "metadata.google.internal"
  ) {
    throw new ConnectorError("Endereços internos não são permitidos.");
  }
  return u;
}

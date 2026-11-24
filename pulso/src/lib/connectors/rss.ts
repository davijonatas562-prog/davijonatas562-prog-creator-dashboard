import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import { matchesProfile } from "@/lib/terms";
import type { SourceId } from "@/lib/types";
import { assertPublicUrl, fetchText, stripHtml } from "./http";
import { ConnectorError, type Connector, type RawMention } from "./types";

export interface FeedItem {
  title: string;
  link: string | null;
  id: string;
  summary: string;
  published: Date | null;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text", trimValues: true });

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Record<string, unknown>)["#text"] ?? "");
  return "";
};
const arr = <T,>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Lê RSS 2.0 e Atom. */
export function parseFeed(xml: string): FeedItem[] {
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new ConnectorError("O endereço não contém um feed RSS/Atom válido.");
  }
  const rss = doc.rss as { channel?: { item?: unknown } } | undefined;
  if (rss?.channel) {
    return arr(rss.channel.item as Record<string, unknown>[]).map((i) => {
      const link = text(i.link) || null;
      const guid = text(i.guid) || link || text(i.title);
      const date = text(i.pubDate) || text(i["dc:date"]);
      return {
        title: stripHtml(text(i.title)),
        link,
        id: guid,
        summary: stripHtml(text(i.description) || text(i["content:encoded"])).slice(0, 1200),
        published: date ? new Date(date) : null,
      };
    });
  }
  const feed = doc.feed as { entry?: unknown } | undefined;
  if (feed) {
    return arr(feed.entry as Record<string, unknown>[]).map((e) => {
      const links = arr(e.link as Record<string, string>[]);
      const href = (links.find((l) => !l["@rel"] || l["@rel"] === "alternate") ?? links[0])?.["@href"] ?? null;
      const date = text(e.published) || text(e.updated);
      return {
        title: stripHtml(text(e.title)),
        link: href,
        id: text(e.id) || href || text(e.title),
        summary: stripHtml(text(e.summary) || text(e.content)).slice(0, 1200),
        published: date ? new Date(date) : null,
      };
    });
  }
  throw new ConnectorError("O endereço não contém um feed RSS/Atom válido.");
}

export function hashId(s: string) {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

export function feedsFromConfig(config: Record<string, unknown>): string[] {
  const feeds = config.feeds;
  return Array.isArray(feeds) ? feeds.filter((f): f is string => typeof f === "string" && /^https?:\/\//i.test(f)).slice(0, 30) : [];
}

function rssConnector(id: SourceId, relevance: number): Connector {
  return {
    id,
    missingSetup: () => null,
    missingConfig: (config) => (feedsFromConfig(config).length ? null : "Cadastre pelo menos um endereço de feed RSS."),
    async collect({ profile, config, since }) {
      const feeds = feedsFromConfig(config);
      const out: RawMention[] = [];
      const errors: string[] = [];
      await Promise.all(
        feeds.map(async (url) => {
          try {
            const items = parseFeed(await fetchText(assertPublicUrl(url).toString()));
            for (const it of items) {
              if (it.published && it.published < since) continue;
              const textAll = `${it.title}. ${it.summary}`;
              if (!matchesProfile(textAll, profile.terms, profile.nicknames).matched) continue;
              out.push({
                externalId: hashId(it.link || it.id),
                url: it.link,
                authorName: new URL(url).hostname.replace(/^www\./, ""),
                content: it.summary ? `${it.title} — ${it.summary}` : it.title,
                contentType: "article",
                publishedAt: it.published && !Number.isNaN(it.published.getTime()) ? it.published : new Date(),
                reach: null,
                engagement: null,
                relevance,
              });
            }
          } catch (e) {
            errors.push(`${new URL(url).hostname}: ${e instanceof Error ? e.message : "erro"}`);
          }
        }),
      );
      if (errors.length === feeds.length && feeds.length) throw new ConnectorError(errors.join(" | "));
      return out;
    },
  };
}

export const newsSitesConnector = rssConnector("news_sites", 0.85);
export const blogsConnector = rssConnector("blogs", 0.6);

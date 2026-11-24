import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseFeed, newsSitesConnector } from "../src/lib/connectors/rss";
import { gnewsConnector } from "../src/lib/connectors/gnews";
import { youtubeConnector } from "../src/lib/connectors/youtube";
import { facebookConnector, instagramConnector } from "../src/lib/connectors/meta";
import { assertPublicUrl, orQuery } from "../src/lib/connectors/http";
import type { ProfileQuery } from "../src/lib/connectors/types";

const profile: ProfileQuery = {
  id: "p1",
  publicName: "Prefeito Alessandro",
  nicknames: ["Brazão"],
  terms: [
    { term: "Alessandro Brazão", kind: "primary" },
    { term: "Ferreira Gomes", kind: "context" },
  ],
};
const since = new Date("2026-11-01T00:00:00Z");

type Route = [RegExp, unknown];
let routes: Route[] = [];
const calls: string[] = [];
beforeEach(() => {
  routes = [];
  calls.length = 0;
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input);
    calls.push(url);
    const hit = routes.find(([re]) => re.test(url));
    if (!hit) return new Response("not found", { status: 404 });
    const body = typeof hit[1] === "string" ? hit[1] : JSON.stringify(hit[1]);
    return new Response(body, { status: 200 });
  }) as typeof fetch;
});

test("RSS: lê um feed real do Google News (formato RSS 2.0)", () => {
  const items = parseFeed(readFileSync(new URL("./fixtures/rss-real.xml", import.meta.url), "utf8"));
  assert.ok(items.length >= 10);
  assert.ok(items[0].title.length > 0 && items[0].link?.startsWith("https://"));
  assert.ok(items[0].published instanceof Date && !Number.isNaN(items[0].published.getTime()));
});

test("RSS: lê Atom", () => {
  const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Alessandro Brazão visita obra</title><link href="https://blog.ex/a"/><id>tag:1</id><updated>2026-11-20T10:00:00Z</updated><summary>Em Ferreira Gomes</summary></entry></feed>`;
  const [e] = parseFeed(atom);
  assert.equal(e.link, "https://blog.ex/a");
  assert.equal(e.summary, "Em Ferreira Gomes");
});

test("RSS: conector filtra por termos, contexto e data", async () => {
  routes.push([
    /portal\.ex/,
    `<rss><channel>
      <item><title>Alessandro Brazão inaugura escola em Ferreira Gomes</title><link>https://portal.ex/1</link><pubDate>Fri, 20 Nov 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Obra entregue&lt;/p&gt;</description></item>
      <item><title>Alessandro Brazão palestra em Macapá</title><link>https://portal.ex/2</link><pubDate>Fri, 20 Nov 2026 10:00:00 GMT</pubDate></item>
      <item><title>Alessandro Brazão em Ferreira Gomes (antigo)</title><link>https://portal.ex/3</link><pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate></item>
    </channel></rss>`,
  ]);
  const out = await newsSitesConnector.collect({ profile, config: { feeds: ["https://portal.ex/feed"] }, secrets: null, since });
  assert.equal(out.length, 1);
  assert.equal(out[0].url, "https://portal.ex/1");
  assert.match(out[0].content, /Obra entregue/);
  assert.equal(out[0].contentType, "article");
});

test("RSS: feed interno é bloqueado (SSRF) e falha de todos os feeds vira erro", async () => {
  assert.throws(() => assertPublicUrl("http://169.254.169.254/latest"), /internos/);
  assert.throws(() => assertPublicUrl("http://localhost:3000/x"), /internos/);
  assert.throws(() => assertPublicUrl("file:///etc/passwd"), /http/);
  await assert.rejects(newsSitesConnector.collect({ profile, config: { feeds: ["http://10.0.0.5/feed"] }, secrets: null, since }), /internos/);
  assert.equal(calls.length, 0);
});

test("GNews: monta a busca e filtra pelo perfil", async () => {
  process.env.GNEWS_API_KEY = "k";
  routes.push([
    /gnews\.io\/api\/v4\/search/,
    {
      articles: [
        { title: "Alessandro Brazão anuncia obra", description: "Ferreira Gomes recebe asfalto", url: "https://g1.ex/a", publishedAt: "2026-11-20T10:00:00Z", source: { name: "G1 AP" } },
        { title: "Outro assunto", description: "nada", url: "https://g1.ex/b", publishedAt: "2026-11-20T10:00:00Z", source: { name: "G1" } },
      ],
    },
  ]);
  const out = await gnewsConnector.collect({ profile, config: {}, secrets: null, since });
  assert.equal(out.length, 1);
  assert.equal(out[0].authorName, "G1 AP");
  const q = new URL(calls[0]).searchParams;
  assert.equal(q.get("lang"), "pt");
  assert.equal(q.get("q"), orQuery(["Alessandro Brazão", "Brazão"]));
  delete process.env.GNEWS_API_KEY;
  assert.match(gnewsConnector.missingSetup() ?? "", /GNEWS_API_KEY/);
});

test("YouTube: vídeo que cita o perfil + comentários públicos, sem nome de autor", async () => {
  process.env.YOUTUBE_API_KEY = "k";
  routes.push([/\/search\?/, { items: [{ id: { videoId: "v1" }, snippet: { title: "Prefeito Alessandro Brazão em Ferreira Gomes", description: "", channelTitle: "TV Local", publishedAt: "2026-11-20T10:00:00Z" } }] }]);
  routes.push([/\/videos\?/, { items: [{ id: "v1", statistics: { viewCount: "1500", likeCount: "40", commentCount: "3" } }] }]);
  routes.push([
    /\/commentThreads\?/,
    { items: [{ id: "c1", snippet: { totalReplyCount: 1, topLevelComment: { snippet: { textOriginal: "Cadê a obra da escola?", publishedAt: "2026-11-21T10:00:00Z", likeCount: 4 } } } }] },
  ]);
  const out = await youtubeConnector.collect({ profile, config: {}, secrets: null, since });
  const video = out.find((m) => m.contentType === "video")!;
  const comment = out.find((m) => m.contentType === "comment")!;
  assert.equal(video.reach, 1500);
  assert.equal(comment.content, "Cadê a obra da escola?");
  assert.equal(comment.authorName, null);
  assert.equal(comment.engagement, 5);
  delete process.env.YOUTUBE_API_KEY;
});

const metaConfig = { accounts: [{ profileId: "p1", pageId: "100", pageName: "Página", igUserId: "200", igUsername: "prefeito" }] };
const metaSecrets = { pages: { "100": "PAGE_TOKEN" } };

test("Facebook: comentários dos posts da Página do perfil", async () => {
  routes.push([
    /100\/posts/,
    { data: [{ id: "p_1", created_time: "2026-11-20T10:00:00+0000", permalink_url: "https://fb.ex/p1", comments: { data: [{ id: "cm1", message: "Parabéns pela obra!", created_time: "2026-11-20T12:00:00+0000", like_count: 3 }] } }] },
  ]);
  const out = await facebookConnector.collect({ profile, config: metaConfig, secrets: metaSecrets, since });
  assert.equal(out.length, 1);
  assert.equal(out[0].externalId, "comment:cm1");
  assert.match(calls[0], /access_token=PAGE_TOKEN/);
});

test("Instagram: comentários + marcações; token expirado vira mensagem clara", async () => {
  routes.push([/200\/media/, { data: [{ id: "m1", timestamp: "2026-11-20T10:00:00+0000", permalink: "https://ig.ex/m1", comments_count: 2 }] }]);
  routes.push([/m1\/comments/, { data: [{ id: "ic1", text: "Rua do bairro continua sem luz", timestamp: "2026-11-21T10:00:00+0000", like_count: 7 }] }]);
  routes.push([/200\/tags/, { data: [{ id: "t1", caption: "Visita do @prefeito hoje", timestamp: "2026-11-22T10:00:00+0000", permalink: "https://ig.ex/t1" }] }]);
  const out = await instagramConnector.collect({ profile, config: metaConfig, secrets: metaSecrets, since });
  assert.deepEqual(out.map((m) => m.externalId).sort(), ["comment:ic1", "tag:t1"]);

  routes = [[/200\/media/, { error: { message: "Error validating access token", code: 190 } }]];
  await assert.rejects(instagramConnector.collect({ profile, config: metaConfig, secrets: metaSecrets, since }), /Reconecte/);
  assert.match(instagramConnector.missingConfig({}, false) ?? "", /Conecte/);
});

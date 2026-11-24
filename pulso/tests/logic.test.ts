import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesProfile, suggestTerms } from "../src/lib/terms";
import { reputationIndex, reputationTrend } from "../src/lib/metrics/reputation";
import { filterInMemory, parseMentionFilters } from "../src/lib/mentions/filters";
import { buildUserMessage } from "../src/lib/sentiment/prompt";
import type { Mention, MentionItem, SearchTerm } from "../src/lib/types";

const terms: SearchTerm[] = [
  { term: "Alessandro Brazão", kind: "primary" },
  { term: "Prefeito Alessandro", kind: "primary" },
  { term: "Ferreira Gomes", kind: "context" },
  { term: "Alessandro Brazão Filho", kind: "exclude" },
];

test("termos: cita nome + contexto → atribui (sem acento e caixa)", () => {
  assert.equal(matchesProfile("prefeito alessandro visitou a obra em FERREIRA GOMES", terms).matched, true);
});
test("termos: nome sem contexto → descarta (homônimo)", () => {
  const r = matchesProfile("Alessandro Brazão palestrou em Macapá", terms);
  assert.equal(r.matched, false);
  assert.match(r.reason, /homônimo/);
});
test("termos: exclusão vence", () => {
  assert.equal(matchesProfile("Alessandro Brazão Filho em Ferreira Gomes", terms).matched, false);
});
test("termos: não casa pedaço de palavra", () => {
  assert.equal(matchesProfile("Prefeito Alessandrooo em Ferreira Gomes", terms).matched, false);
});
test("termos: apelido conta como principal", () => {
  assert.equal(matchesProfile("Brazão em Ferreira Gomes", terms, ["Brazão"]).matched, true);
});
test("sugestão de termos a partir do cadastro", () => {
  const s = suggestTerms({ fullName: "Alessandro Brazão", publicName: "Prefeito Alessandro", office: "Prefeito", municipality: "Ferreira Gomes", nicknames: [] });
  const by = (k: string) => s.filter((t) => t.kind === k).map((t) => t.term);
  assert.ok(by("primary").includes("Alessandro Ferreira Gomes"));
  assert.deepEqual(by("context"), ["Ferreira Gomes"]);
  assert.deepEqual(by("related"), ["Prefeitura de Ferreira Gomes"]);
});

const mk = (i: number, sentiment: Mention["sentiment"], at: Date): Mention => ({
  id: String(i), sourceId: "instagram", publishedAt: at.toISOString(), sentiment, confidence: 0.9, topic: "Saúde",
  reach: 10, engagement: 1, relevance: 0.8, content: "x", authorName: null, url: null,
});

test("índice: sem menções → null; tudo positivo puxa para cima mas com fator de volume", () => {
  const end = new Date("2026-11-24T12:00:00Z");
  const start = new Date(end.getTime() - 7 * 864e5);
  assert.equal(reputationIndex([], start, end).score, null);
  const few = reputationIndex([mk(1, "positive", end)], start, end);
  assert.ok(few.score! > 50 && few.score! < 55, `poucos dados devem ficar perto de 50 (veio ${few.score})`);
  const many = reputationIndex(Array.from({ length: 200 }, (_, i) => mk(i, "positive", end)), start, end);
  assert.ok(many.score! >= 90);
  const neg = reputationIndex(Array.from({ length: 200 }, (_, i) => mk(i, "negative", end)), start, end);
  assert.ok(neg.score! <= 10);
});
test("índice: indeterminadas não entram; tendência exige amostra mínima", () => {
  const end = new Date("2026-11-24T12:00:00Z");
  const start = new Date(end.getTime() - 864e5);
  const r = reputationIndex(Array.from({ length: 50 }, (_, i) => mk(i, "undetermined", end)), start, end);
  assert.equal(r.score, null);
  const a = reputationIndex(Array.from({ length: 5 }, (_, i) => mk(i, "positive", end)), start, end);
  assert.equal(reputationTrend(a, a).trend, "insufficient");
});

test("filtros em memória: sentimento, busca sem acento, não classificadas e paginação", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const base = (i: number, s: MentionItem["analysis"], content: string): MentionItem => ({
    id: `m${i}`, sourceId: i % 2 ? "x" : "instagram", publishedAt: new Date(now.getTime() - i * 3600e3).toISOString(), content,
    authorName: null, url: null, contentType: "post", reach: i, engagement: null, relevance: 0.5, status: "new", topic: "Saúde", saved: i === 3, analysis: s,
  });
  const an = (sentiment: "positive" | "negative") => ({ sentiment, confidence: 0.9, emotion: null, stance: "unknown" as const, irony: false, sarcasm: false, context: null, isManual: false, model: null });
  const items = [base(1, an("negative"), "Posto de saúde sem médico"), base(2, an("positive"), "Ótimo atendimento"), base(3, null, "Aviso")];
  const f = (sp: Record<string, string>) => filterInMemory(items, parseMentionFilters(sp, now));
  assert.equal(f({ sentimento: "negative" }).total, 1);
  assert.equal(f({ sentimento: "unclassified" }).items[0].id, "m3");
  assert.equal(f({ q: "SAUDE" }).total, 1);
  assert.equal(f({ rede: "x" }).total, 2);
  assert.equal(f({ salvas: "1" }).total, 1);
  assert.equal(f({ ordem: "alcance" }).items[0].id, "m3");
});

test("prompt: inclui perfil, assuntos, correções e ids das menções", () => {
  const msg = buildUserMessage({
    profile: { publicName: "Prefeito Alessandro", office: "Prefeito", municipality: "Ferreira Gomes", state: "AP" },
    knownTopics: ["Saúde"],
    corrections: [{ text: "tá de parabéns, só que não", sentiment: "negative" }],
    mentions: [{ id: "abc", source: "x", author: null, text: "Cadê a obra?" }],
  });
  assert.match(msg, /Prefeito Alessandro, Prefeito de Ferreira Gomes\/AP/);
  assert.match(msg, /Assuntos já usados pela equipe: Saúde/);
  assert.match(msg, /só que não" → negative/);
  assert.match(msg, /"id": "abc"/);
});

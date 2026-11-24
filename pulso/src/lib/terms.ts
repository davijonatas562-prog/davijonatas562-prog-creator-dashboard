import type { SearchTerm } from "@/lib/types";

/** Normaliza para comparação: minúsculas e sem acentos. */
export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function contains(text: string, term: string) {
  const t = normalize(term);
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

export interface MatchResult {
  matched: boolean;
  reason: string;
  hits: string[];
}

/**
 * Decide se um texto fala do perfil monitorado:
 *  1. precisa citar ao menos um termo principal ou apelido;
 *  2. não pode citar nenhum termo de exclusão (homônimos);
 *  3. se houver termos de contexto, precisa citar ao menos um deles
 *     (ex.: "Ferreira Gomes" para não confundir com outro Alessandro).
 * Palavras relacionadas não bastam sozinhas — servem para ampliar a busca nas fontes.
 */
export function matchesProfile(text: string, terms: SearchTerm[], nicknames: string[] = []): MatchResult {
  const n = normalize(text);
  const primary = [...terms.filter((t) => t.kind === "primary").map((t) => t.term), ...nicknames];
  const context = terms.filter((t) => t.kind === "context").map((t) => t.term);
  const exclude = terms.filter((t) => t.kind === "exclude").map((t) => t.term);

  const excluded = exclude.filter((t) => contains(n, t));
  if (excluded.length) return { matched: false, reason: `Contém termo excluído: “${excluded[0]}”.`, hits: excluded };
  const hits = primary.filter((t) => contains(n, t));
  if (!hits.length) return { matched: false, reason: "Não cita nenhum termo principal ou apelido do perfil.", hits: [] };
  if (context.length) {
    const ctx = context.filter((t) => contains(n, t));
    if (!ctx.length) return { matched: false, reason: "Cita o nome, mas nenhum termo de contexto — pode ser um homônimo.", hits };
    return { matched: true, reason: "Cita o perfil e o contexto.", hits: [...hits, ...ctx] };
  }
  return { matched: true, reason: "Cita o perfil.", hits };
}

/** Sugestões de termos a partir do cadastro (o usuário revisa antes de salvar). */
export function suggestTerms(p: { fullName: string; publicName: string; office: string; municipality: string; nicknames: string[] }): SearchTerm[] {
  const out: SearchTerm[] = [];
  const add = (term: string, kind: SearchTerm["kind"]) => {
    const t = term.replace(/\s+/g, " ").trim();
    if (t.length >= 3 && !out.some((o) => normalize(o.term) === normalize(t))) out.push({ term: t, kind });
  };
  const parts = p.fullName.trim().split(/\s+/).filter((w) => w.length > 2 && !["da", "de", "do", "dos", "das"].includes(w.toLowerCase()));
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (p.publicName) add(p.publicName, "primary");
  if (first && last && first !== last) add(`${first} ${last}`, "primary");
  if (p.office && first) add(`${p.office} ${first}`, "primary");
  p.nicknames.forEach((n) => add(n, "primary"));
  if (p.municipality) {
    add(p.municipality, "context");
    if (first) add(`${first} ${p.municipality}`, "primary");
    if (/prefeit/i.test(p.office)) add(`Prefeitura de ${p.municipality}`, "related");
    if (/vereador/i.test(p.office)) add(`Câmara de ${p.municipality}`, "related");
  }
  return out;
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProfileWithTerms, SearchTermKind } from "@/lib/types";

type Row = {
  id: string;
  full_name: string;
  public_name: string;
  nicknames: string[];
  office: string | null;
  municipality: string | null;
  state: string | null;
  party: string | null;
  photo_url: string | null;
  status: "active" | "paused";
  search_terms: { term: string; kind: SearchTermKind }[];
};

/** Perfis com termos. Fotos ficam num bucket privado: geramos URLs assinadas de curta duração. */
export async function listProfilesWithTerms(orgId: string): Promise<ProfileWithTerms[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monitored_profiles")
    .select("id, full_name, public_name, nicknames, office, municipality, state, party, photo_url, status, search_terms!search_terms_profile_id_fkey(term, kind)")
    .eq("organization_id", orgId)
    .order("public_name");
  if (error) throw new Error(`Falha ao carregar perfis: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];

  const paths = rows.map((r) => r.photo_url).filter((p): p is string => !!p && !p.startsWith("http"));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from("profile-photos").createSignedUrls(paths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    publicName: r.public_name,
    nicknames: r.nicknames ?? [],
    office: r.office,
    municipality: r.municipality,
    state: r.state,
    party: r.party,
    photoUrl: r.photo_url ? (r.photo_url.startsWith("http") ? r.photo_url : (signed.get(r.photo_url) ?? null)) : null,
    status: r.status,
    terms: r.search_terms ?? [],
  }));
}

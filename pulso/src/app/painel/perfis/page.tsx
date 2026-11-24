import type { Metadata } from "next";
import { ProfilesList } from "@/components/profiles/profiles-list";
import { requireOrg, canEdit } from "@/lib/data/session";
import { listProfilesWithTerms } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { deleteProfile, setProfileStatus } from "./actions";

export const metadata: Metadata = { title: "Perfis monitorados" };

export default async function ProfilesPage() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const [profiles, { data: plan }] = await Promise.all([
    listProfilesWithTerms(ctx.org.id),
    supabase.from("plans").select("max_profiles").eq("id", ctx.org.planId).maybeSingle(),
  ]);
  return (
    <ProfilesList
      mode="app"
      base="/painel"
      profiles={profiles}
      canEdit={canEdit(ctx.org.role)}
      limit={(plan?.max_profiles as number | null) ?? null}
      actions={{ setStatus: setProfileStatus, remove: deleteProfile }}
    />
  );
}

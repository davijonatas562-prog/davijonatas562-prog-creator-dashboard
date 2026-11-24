import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/profiles/profile-form";
import { requireOrg, canEdit } from "@/lib/data/session";
import { listProfilesWithTerms } from "@/lib/data/profiles";
import { saveProfile, uploadProfilePhoto } from "../actions";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function EditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireOrg();
  const profile = (await listProfilesWithTerms(ctx.org.id)).find((p) => p.id === id);
  if (!profile) notFound();
  return (
    <ProfileForm mode="app" base="/painel" initial={profile} canEdit={canEdit(ctx.org.role)} actions={{ save: saveProfile, upload: uploadProfilePhoto }} />
  );
}

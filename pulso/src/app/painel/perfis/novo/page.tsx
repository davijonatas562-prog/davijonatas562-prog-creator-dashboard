import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profiles/profile-form";
import { requireOrg, canEdit } from "@/lib/data/session";
import { saveProfile, uploadProfilePhoto } from "../actions";

export const metadata: Metadata = { title: "Novo perfil" };

export default async function NewProfilePage() {
  const ctx = await requireOrg();
  if (!canEdit(ctx.org.role)) redirect("/painel/perfis");
  return <ProfileForm mode="app" base="/painel" initial={null} canEdit actions={{ save: saveProfile, upload: uploadProfilePhoto }} />;
}

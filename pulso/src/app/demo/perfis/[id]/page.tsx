import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/profiles/profile-form";
import { DEMO_PROFILES_FULL } from "@/lib/demo/data";

export const metadata = { title: "Editar perfil · Demonstração" };

export default async function DemoEditProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = DEMO_PROFILES_FULL.find((p) => p.id === id);
  if (!profile) notFound();
  return <ProfileForm mode="demo" base="/demo" initial={profile} canEdit />;
}

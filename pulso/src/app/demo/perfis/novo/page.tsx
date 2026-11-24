import { ProfileForm } from "@/components/profiles/profile-form";

export const metadata = { title: "Novo perfil · Demonstração" };

export default function DemoNewProfilePage() {
  return <ProfileForm mode="demo" base="/demo" initial={null} canEdit />;
}

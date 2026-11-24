import { ProfilesList } from "@/components/profiles/profiles-list";
import { DEMO_PROFILES_FULL } from "@/lib/demo/data";

export const metadata = { title: "Perfis · Demonstração" };

export default function DemoProfilesPage() {
  return <ProfilesList mode="demo" base="/demo" profiles={DEMO_PROFILES_FULL} canEdit limit={5} />;
}

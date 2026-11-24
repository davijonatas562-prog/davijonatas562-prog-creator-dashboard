import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "Demonstração" };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell mode="demo" user={null} orgs={[]} currentOrgId={null}>
      {children}
    </AppShell>
  );
}

import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { requireOrg } from "@/lib/data/session";
import { ROLE_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOrg();
  return (
    <AppShell
      mode="app"
      user={{ name: ctx.user.fullName ?? ctx.user.email, email: ctx.user.email }}
      orgs={ctx.memberships.map((m) => ({ id: m.id, name: m.name, roleLabel: ROLE_LABEL[m.role] }))}
      currentOrgId={ctx.org.id}
    >
      {children}
    </AppShell>
  );
}

import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { MemberRole } from "@/lib/types";

export const ORG_COOKIE = "pulso_org";

export interface OrgMembership {
  id: string;
  name: string;
  slug: string;
  planId: string;
  dataRetentionDays: number;
  role: MemberRole;
}

export interface SessionContext {
  user: { id: string; email: string; fullName: string | null };
  memberships: OrgMembership[];
  org: OrgMembership | null;
}

type MemberRow = {
  role: MemberRole;
  organizations: { id: string; name: string; slug: string; plan_id: string; data_retention_days: number } | null;
};

/** Usuário autenticado + organizações (cache por requisição). Redireciona para /entrar se não houver sessão. */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  if (!isSupabaseConfigured()) redirect("/entrar?erro=config");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organizations(id, name, slug, plan_id, data_retention_days)")
      .eq("user_id", user.id),
  ]);

  const memberships: OrgMembership[] = ((rows ?? []) as unknown as MemberRow[])
    .filter((r) => r.organizations)
    .map((r) => ({
      id: r.organizations!.id,
      name: r.organizations!.name,
      slug: r.organizations!.slug,
      planId: r.organizations!.plan_id,
      dataRetentionDays: r.organizations!.data_retention_days,
      role: r.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const preferred = (await cookies()).get(ORG_COOKIE)?.value;
  const org = memberships.find((m) => m.id === preferred) ?? memberships[0] ?? null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      fullName: (profile?.full_name as string | null) ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    },
    memberships,
    org,
  };
});

/** Exige organização; sem ela, manda para o onboarding. */
export async function requireOrg() {
  const ctx = await getSessionContext();
  if (!ctx.org) redirect("/onboarding");
  return ctx as SessionContext & { org: OrgMembership };
}

export function canEdit(role: MemberRole) {
  return role === "owner" || role === "admin";
}

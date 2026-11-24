import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { requireOrg, canEdit } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type MemberRole } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DangerConfirm, MemberRoleControl, OrgSettingsForm } from "../settings-forms";
import { PageTitle, Section } from "../settings-section";

export const metadata: Metadata = { title: "Organização" };

type MemberRow = { user_id: string; role: MemberRole; created_at: string; users: { full_name: string | null; email: string } | null };
type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  max_profiles: number | null;
  max_sources: number | null;
  max_users: number | null;
  history_days: number | null;
  max_reports_month: number | null;
  max_alerts_month: number | null;
  max_ai_queries_month: number | null;
};
type AuditRow = { id: number; action: string; created_at: string; metadata: Record<string, unknown>; users: { full_name: string | null; email: string } | null };

const PERMISSIONS: [string, MemberRole[]][] = [
  ["Ver dashboard, menções e relatórios", ["owner", "admin", "analyst", "viewer"]],
  ["Classificar menções e mudar status", ["owner", "admin", "analyst"]],
  ["Gerar e compartilhar relatórios", ["owner", "admin", "analyst"]],
  ["Gerenciar perfis, termos e fontes", ["owner", "admin"]],
  ["Gerenciar equipe e ver auditoria", ["owner", "admin"]],
  ["Excluir a organização", ["owner"]],
];

const ACTION_LABEL: Record<string, string> = {
  "organization.created": "criou a organização",
  "organization.updated": "alterou as configurações",
  "member.role_changed": "alterou o papel de um membro",
  "member.removed": "removeu um membro",
  "mention.sentiment_corrected": "corrigiu o sentimento de uma menção",
};

const limit = (v: number | null, unit = "") => (v === null ? "Ilimitado" : `${v.toLocaleString("pt-BR")}${unit}`);

export default async function OrganizationPage() {
  const ctx = await requireOrg();
  const supabase = await createClient();
  const editable = canEdit(ctx.org.role);

  const [{ data: members }, { data: plans }, audit] = await Promise.all([
    supabase.from("organization_members").select("user_id, role, created_at, users(full_name, email)").eq("organization_id", ctx.org.id).order("created_at"),
    supabase.from("plans").select("*").eq("is_public", true).order("sort_order"),
    editable
      ? supabase
          .from("audit_logs")
          .select("id, action, created_at, metadata, users(full_name, email)")
          .eq("organization_id", ctx.org.id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] }),
  ]);

  const memberRows = (members ?? []) as unknown as MemberRow[];
  const planRows = (plans ?? []) as PlanRow[];
  const auditRows = ((audit.data ?? []) as unknown as AuditRow[]);

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageTitle title="Organização" description="Equipe, permissões, plano e política de dados." />

      <Section title="Dados gerais" description={editable ? "Visível para todos os membros." : "Somente proprietários e administradores podem editar."}>
        <OrgSettingsForm name={ctx.org.name} retention={ctx.org.dataRetentionDays} canEdit={editable} />
      </Section>

      <Section title="Equipe" description={`Seu papel: ${ROLE_LABEL[ctx.org.role]}. Cada pessoa só enxerga os dados das organizações de que participa.`}>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {memberRows.map((m) => {
            const name = m.users?.full_name || m.users?.email || "Usuário";
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {name} {m.user_id === ctx.user.id && <span className="text-xs text-muted-foreground">(você)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.users?.email}</p>
                </div>
                <MemberRoleControl userId={m.user_id} role={m.role} editable={editable && m.user_id !== ctx.user.id} />
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">O convite de novos membros por e-mail chega na Fase 5, junto com o compartilhamento de relatórios.</p>
      </Section>

      <Section title="Permissões por papel" description="Aplicadas no banco de dados (Row Level Security), não apenas na interface.">
        <div className="overflow-x-auto rounded-lg border border-border scrollbar-thin">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Ação</th>
                {(["owner", "admin", "analyst", "viewer"] as MemberRole[]).map((r) => (
                  <th key={r} className={cn("px-3 py-2 text-center font-medium", r === ctx.org.role && "text-primary")}>
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(([label, roles]) => (
                <tr key={label} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2">{label}</td>
                  {(["owner", "admin", "analyst", "viewer"] as MemberRole[]).map((r) => (
                    <td key={r} className="px-3 py-2 text-center">
                      {roles.includes(r) ? <Check className="mx-auto size-3.5 text-positive" aria-label="Permitido" /> : <Minus className="mx-auto size-3.5 text-muted-foreground/50" aria-label="Não permitido" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Plano" description="A cobrança ainda não está ativa: nenhum pagamento é processado até o gateway ser configurado.">
        <div className="grid gap-3 lg:grid-cols-3">
          {planRows.map((p) => {
            const current = p.id === ctx.org.planId;
            return (
              <div key={p.id} className={cn("rounded-lg border p-4", current ? "border-primary/50 bg-primary/5" : "border-border")}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{p.name}</p>
                  {current && <Badge>Plano atual</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                <dl className="mt-4 grid gap-1.5 text-xs">
                  {[
                    ["Perfis monitorados", limit(p.max_profiles)],
                    ["Fontes conectadas", limit(p.max_sources)],
                    ["Usuários", limit(p.max_users)],
                    ["Histórico", limit(p.history_days, " dias")],
                    ["Relatórios/mês", limit(p.max_reports_month)],
                    ["Alertas/mês", limit(p.max_alerts_month)],
                    ["Consultas de IA/mês", limit(p.max_ai_queries_month)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </Section>

      {editable && (
        <Section title="Auditoria" description="Ações sensíveis registradas automaticamente. Visível para proprietários e administradores.">
          {auditRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            <ul className="grid gap-2 text-xs">
              {auditRows.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
                  <span>
                    <span className="font-medium">{a.users?.full_name || a.users?.email || "Sistema"}</span>{" "}
                    <span className="text-muted-foreground">{ACTION_LABEL[a.action] ?? a.action}</span>
                  </span>
                  <time className="tabular-nums text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem", dateStyle: "short", timeStyle: "short" })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {ctx.org.role === "owner" && (
        <Section danger title="Excluir organização" description="Apaga permanentemente todos os dados desta organização (LGPD).">
          <DangerConfirm kind="organization" expected={ctx.org.name} />
        </Section>
      )}
    </div>
  );
}

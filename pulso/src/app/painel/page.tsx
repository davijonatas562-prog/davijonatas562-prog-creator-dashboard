import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { computeDashboard } from "@/lib/metrics/dashboard";
import { resolvePeriod } from "@/lib/metrics/period";
import { requireOrg } from "@/lib/data/session";
import { listMentionsForPeriod, listProfiles, listSourceStatuses } from "@/lib/data/dashboard";
import { refreshMonitoring } from "./actions";

export default async function PainelPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireOrg();
  const [profiles, sources] = await Promise.all([listProfiles(ctx.org.id), listSourceStatuses(ctx.org.id)]);

  if (profiles.length === 0) return <NoProfiles orgName={ctx.org.name} />;

  const profile = profiles.find((p) => p.id === sp.perfil) ?? profiles.find((p) => p.status === "active") ?? profiles[0];
  const period = resolvePeriod(sp, new Date());
  const { mentions, truncated } = await listMentionsForPeriod(profile.id, period);
  const data = computeDashboard(mentions, period);
  const lastUpdated = sources.reduce<string | null>((acc, s) => (s.lastSyncedAt && (!acc || s.lastSyncedAt > acc) ? s.lastSyncedAt : acc), null);

  return (
    <DashboardView
      mode="app"
      data={data}
      profiles={profiles}
      profileId={profile.id}
      sources={sources}
      lastUpdated={lastUpdated}
      onRefresh={refreshMonitoring}
      truncated={truncated}
    />
  );
}

function NoProfiles({ orgName }: { orgName: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{orgName}</p>
      </div>
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <CardContent className="relative flex flex-col items-center px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <UserPlus className="size-5 text-primary" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Organização criada. Próximo passo: o primeiro perfil.</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            O dashboard é calculado a partir das menções reais de um perfil monitorado (etapas 3 a 5 do onboarding). O cadastro de
            perfis e termos chega na Fase 2 e os conectores de fontes, na Fase 3. Até lá, nenhum número é exibido aqui — use a
            demonstração para conhecer todas as telas.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/demo">
              Abrir demonstração <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

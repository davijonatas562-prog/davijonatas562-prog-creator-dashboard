import { DashboardView } from "@/components/dashboard/dashboard-view";
import { computeDashboard } from "@/lib/metrics/dashboard";
import { resolvePeriod } from "@/lib/metrics/period";
import { DEMO_PROFILES, demoSourceStatuses, generateDemoMentions } from "@/lib/demo/data";
import { refreshDemo } from "./actions";

export default async function DemoDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const now = new Date();
  const period = resolvePeriod(sp, now);
  const mentions = generateDemoMentions(now);
  const data = computeDashboard(mentions, period);
  const sources = demoSourceStatuses(now, mentions);
  const lastUpdated = sources.find((s) => s.status === "connected")?.lastSyncedAt ?? null;
  const profile = DEMO_PROFILES[0];

  return (
    <DashboardView
      mode="demo"
      data={data}
      profiles={DEMO_PROFILES}
      profileId={profile.id}
      sources={sources}
      lastUpdated={lastUpdated}
      onRefresh={refreshDemo}
    />
  );
}

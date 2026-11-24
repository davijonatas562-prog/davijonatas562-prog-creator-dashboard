import type { Metadata } from "next";
import { Flame } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ViewsChart } from "@/components/analytics/views-chart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HEATER_THRESHOLD, dailyMetrics, weeklyReels } from "@/lib/data/analytics";
import { getNavItem } from "@/lib/nav";
import { formatCompact } from "@/lib/utils";

const item = getNavItem("/analytics");
export const metadata: Metadata = { title: item.title };

function sum(rows: typeof dailyMetrics, key: "views" | "saves" | "follows") {
  return rows.reduce((acc, r) => acc + r[key], 0);
}
function delta(curr: number, prev: number) {
  return prev === 0 ? 0 : ((curr - prev) / prev) * 100;
}

export default function AnalyticsPage() {
  const thisWeek = dailyMetrics.slice(-7);
  const lastWeek = dailyMetrics.slice(-14, -7);
  const views = sum(thisWeek, "views");
  const saves = sum(thisWeek, "saves");
  const follows = sum(thisWeek, "follows");
  const saveRate = (saves / views) * 100;
  const prevSaveRate = (sum(lastWeek, "saves") / sum(lastWeek, "views")) * 100;

  const heaters = weeklyReels.filter((r) => r.multiplier >= HEATER_THRESHOLD);

  return (
    <>
      <PageHeader item={item} actions={<Badge variant="outline">18 – 24 nov 2026</Badge>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Views" value={formatCompact(views)} delta={delta(views, sum(lastWeek, "views"))} />
        <StatCard label="Saves" value={formatCompact(saves)} delta={delta(saves, sum(lastWeek, "saves"))} />
        <StatCard label="Follows" value={formatCompact(follows)} delta={delta(follows, sum(lastWeek, "follows"))} />
        <StatCard label="Save rate" value={`${saveRate.toFixed(2).replace(".", ",")}%`} delta={delta(saveRate, prevSaveRate)} />
      </div>

      <ViewsChart data={dailyMetrics} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flame className="text-primary size-4" /> Heaters da semana</CardTitle>
          <CardDescription>Reels com ≥ {HEATER_THRESHOLD}× a mediana de views do perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hook</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Saves</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Follows</TableHead>
                <TableHead className="text-right">vs. mediana</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyReels.map((r) => {
                const hot = r.multiplier >= HEATER_THRESHOLD;
                return (
                  <TableRow key={r.id} className={hot ? "" : "opacity-55"}>
                    <TableCell className="max-w-[320px]">
                      <div className="flex items-center gap-2">
                        {hot && <Flame className="text-primary size-4 shrink-0" />}
                        <span className="truncate font-medium">{r.hook}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {new Date(`${r.postedAt}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCompact(r.views)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCompact(r.saves)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCompact(r.shares)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCompact(r.follows)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={hot ? "default" : "secondary"} className="tabular-nums">
                        {r.multiplier.toFixed(1).replace(".", ",")}×
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-muted-foreground mt-3 text-xs">{heaters.length} heaters de {weeklyReels.length} reels publicados.</p>
        </CardContent>
      </Card>
    </>
  );
}

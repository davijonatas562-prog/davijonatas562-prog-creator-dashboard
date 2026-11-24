import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatPct } from "@/lib/utils";

export function StatCard({ label, value, delta, hint }: { label: string; value: string; delta?: number; hint?: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="gap-2 py-5">
      <CardContent className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        {delta !== undefined && (
          <p className={cn("flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-destructive")}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {formatPct(delta)} <span className="text-muted-foreground font-normal">{hint ?? "vs. semana anterior"}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

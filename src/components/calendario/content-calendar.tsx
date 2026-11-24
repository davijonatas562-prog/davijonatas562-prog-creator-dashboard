"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CalendarEntry, CalendarStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TODAY = "2026-11-24";
const statusDot: Record<CalendarStatus, string> = {
  ideia: "bg-muted-foreground/60",
  roteirizado: "bg-chart-2",
  gravado: "bg-chart-3",
  publicado: "bg-primary",
};

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const statusStyle: Record<CalendarStatus, string> = {
  ideia: "border-l-muted-foreground/50 bg-muted/60",
  roteirizado: "border-l-chart-2 bg-chart-2/10",
  gravado: "border-l-chart-3 bg-chart-3/10",
  publicado: "border-l-primary bg-primary/12",
};

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ContentCalendar({ entries }: { entries: CalendarEntry[] }) {
  const [cursor, setCursor] = useState({ y: 2026, m: 10 }); // novembro
  const { y, m } = cursor;

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // semana começa na segunda
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const byDate = new Map<string, CalendarEntry[]>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  const shift = (n: number) => setCursor(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  const rawLabel = new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  const monthEntries = entries.filter((e) => e.date.startsWith(iso(y, m, 1).slice(0, 7)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft /></Button>
          <h2 className="min-w-48 text-center text-lg font-semibold">{monthLabel}</h2>
          <Button size="icon" variant="outline" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight /></Button>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
          {(Object.keys(statusStyle) as CalendarStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 capitalize">
              <span className={cn("size-2 rounded-full", statusDot[s])} />
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1"><Terminal className="text-primary size-3" /> via /script</span>
        </div>
      </div>

      {/* Grade mensal (desktop) */}
      <Card className="hidden overflow-hidden p-0 md:block">
        <div className="grid grid-cols-7 border-b">
          {weekdays.map((d) => (
            <div key={d} className="text-muted-foreground px-2 py-2 text-xs font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const date = d ? iso(y, m, d) : "";
            const items = d ? byDate.get(date) ?? [] : [];
            return (
              <div key={i} className={cn("min-h-28 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0", !d && "bg-muted/20")}>
                {d && (
                  <span
                    className={cn(
                      "mb-1 inline-grid size-6 place-items-center rounded-full text-xs",
                      date === TODAY ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {d}
                  </span>
                )}
                <div className="space-y-1">
                  {items.map((e) => (
                    <div key={e.id} className={cn("rounded border-l-4 px-1.5 py-1", statusStyle[e.status])} title={`${e.hook} — ${e.angle}`}>
                      <p className="line-clamp-2 text-[11px] leading-tight font-medium">
                        {e.fromScript && <Terminal className="text-primary mr-1 inline size-2.5 align-baseline" />}
                        {e.hook}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">{e.angle} · {e.format}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Lista (mobile) */}
      <div className="space-y-2 md:hidden">
        {monthEntries.length === 0 && <p className="text-muted-foreground text-sm">Nada planejado neste mês.</p>}
        {monthEntries.map((e) => (
          <Card key={e.id} className={cn("border-l-4 py-3", statusStyle[e.status])}>
            <CardContent className="px-4">
              <p className="text-muted-foreground text-xs">
                {new Date(`${e.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {e.format} · {e.status}
              </p>
              <p className="font-medium">{e.hook}</p>
              <p className="text-muted-foreground text-xs">Ângulo: {e.angle}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

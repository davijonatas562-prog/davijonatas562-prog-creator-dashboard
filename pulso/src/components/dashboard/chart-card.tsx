"use client";

import * as React from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TableView {
  columns: string[];
  rows: (string | number)[][];
}

/** Card de gráfico com alternância Gráfico/Tabela (acessibilidade e leitura exata). */
export function ChartCard({
  title,
  description,
  table,
  legend,
  className,
  children,
  delay = 0,
}: {
  title: string;
  description?: string;
  table?: TableView;
  legend?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card
      className={cn("flex min-w-0 flex-col animate-in fade-in-0 slide-in-from-bottom-1 duration-500 fill-mode-both hover:border-muted-foreground/25", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {table && (
          <div className="flex shrink-0 rounded-md border border-border p-0.5" role="group" aria-label="Modo de visualização">
            {(
              [
                ["chart", BarChart3, "Gráfico"],
                ["table", Table2, "Tabela"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                title={label}
                className={cn(
                  "rounded px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground",
                  view === key && "bg-accent text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      {legend && view === "chart" && <div className="px-5 pt-3">{legend}</div>}
      <CardContent className="flex-1">
        {view === "chart" || !table ? (
          children
        ) : (
          <div className="max-h-72 overflow-auto rounded-md border border-border scrollbar-thin">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr>
                  {table.columns.map((c, i) => (
                    <th key={c} className={cn("border-b border-border px-3 py-2 font-medium text-muted-foreground", i === 0 ? "text-left" : "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    {r.map((v, j) => (
                      <td key={j} className={cn("px-3 py-1.5", j === 0 ? "text-left" : "text-right tabular-nums")}>
                        {typeof v === "number" ? v.toLocaleString("pt-BR") : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", i.className)} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartEmpty({ message = "Sem dados no período." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
      {message}
    </div>
  );
}
